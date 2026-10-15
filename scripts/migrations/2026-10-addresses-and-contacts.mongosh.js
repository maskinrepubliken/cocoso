/* global db */
// One-off migration to structured addresses and contact details.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-10-addresses-and-contacts.mongosh.js
//
// Idempotent; documents that already have the new fields are left alone.
// It:
//   - gives every resource an `address` ({ street, postalCode, city }),
//     read from "Adress: …" in its description when there is one, and
//     otherwise just the town from its name or its location; and a
//     `contact.phone` from "Telefon …" in the description,
//   - turns an activity's free-text `address` into an address object, or
//     removes it when it is empty,
//   - gives every group a `contact` copied from its author's public contact.
//
// Resources that end up with a town only are listed at the end: their
// address is incomplete and the form will ask for a street or coordinates
// the next time they are edited.

const site = db.site.findOne({}) || { settings: {} };
const siteCity = (site.settings && site.settings.city) || '';

const locationNames = {};
db.locations.find({}, { name: 1 }).forEach((l) => {
  locationNames[l._id] = l.name.replace(/\s+tätort$/i, '');
});

const plain = (html) =>
  (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const postal = (code) => {
  const digits = (code || '').replace(/\s/g, '');
  return /^\d{5}$/.test(digits) ? `${digits.slice(0, 3)} ${digits.slice(3)}` : code;
};

// "Adress: Willéns väg 5, 514 33 Tranemo"
const ADDRESS = /Adress:?\s*([^.,]+?),\s*(\d{3}\s?\d{2})\s+([A-ZÅÄÖ][\wåäöÅÄÖé-]+)/;
// "Telefon 0325-57 64 00"
const PHONE = /Telefon:?\s*(\+?[\d][\d\s-]{5,}\d)/;

// --- resources ------------------------------------------------------------

const incomplete = [];
let resourcesDone = 0;
db.resources.find({ address: { $exists: false } }).forEach((r) => {
  const text = plain(r.description);
  const match = text.match(ADDRESS);
  let address;
  if (match) {
    address = { street: match[1].trim(), postalCode: postal(match[2]), city: match[3] };
  } else {
    // "Glasets Hus, Limmared" -> Limmared; else the location's name.
    const parts = (r.label || '').split(',');
    const fromLabel = parts.length > 1 ? parts[parts.length - 1].trim() : '';
    const city = fromLabel || locationNames[r.locationId] || siteCity;
    address = { city };
    incomplete.push(`${r._id}  ${r.label}  (${city})`);
  }
  const set = { address };
  const phone = !r.contact && text.match(PHONE);
  if (phone) {
    set.contact = { phone: phone[1].trim() };
  }
  db.resources.updateOne({ _id: r._id }, { $set: set });
  resourcesDone += 1;
});
print(`resources: ${resourcesDone} given an address`);

// --- activities -----------------------------------------------------------

let activitiesDone = 0;
db.activities.find({ address: { $type: 'string' } }).forEach((a) => {
  const street = a.address.trim();
  if (!street) {
    db.activities.updateOne({ _id: a._id }, { $unset: { address: 1 } });
  } else {
    const city = locationNames[a.locationId] || siteCity;
    db.activities.updateOne(
      { _id: a._id },
      { $set: { address: { street, city } } }
    );
  }
  activitiesDone += 1;
});
print(`activities: ${activitiesDone} free-text addresses converted or removed`);

// --- groups ---------------------------------------------------------------

let groupsDone = 0;
const groupsWithout = [];
db.groups.find({ contact: { $exists: false } }).forEach((g) => {
  const author = db.users.findOne(
    { _id: g.authorId },
    { publicContact: 1, emails: 1 }
  );
  const pc = (author && author.publicContact) || {};
  const contact = {};
  ['email', 'phone', 'website'].forEach((k) => {
    if (pc[k]) contact[k] = pc[k];
  });
  if (!contact.email && !contact.phone) {
    groupsWithout.push(`${g._id}  ${g.title}`);
    return;
  }
  db.groups.updateOne({ _id: g._id }, { $set: { contact } });
  groupsDone += 1;
});
print(`groups: ${groupsDone} given the author's contact details`);

if (incomplete.length) {
  print(`\nResources with a town only (add a street or coordinates):`);
  incomplete.forEach((line) => print(`  ${line}`));
}
if (groupsWithout.length) {
  print(`\nGroups whose author has no public email or phone (edit by hand):`);
  groupsWithout.forEach((line) => print(`  ${line}`));
}

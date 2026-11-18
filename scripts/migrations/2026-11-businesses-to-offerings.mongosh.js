// Äta, handla & bo is no longer a collection of its own (businesses): it
// lists the places (resources) that offer something (offerings). Each
// business becomes a place with an offering per kind it had (eat, shop,
// stay), or, when a place by that name exists, offerings on that place.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-11-businesses-to-offerings.mongosh.js
//
// Idempotent: a business whose offerings exist (legacyBusinessId) is
// skipped. The businesses collection is left as it is.
//
// - The place gets the label, images, location and address; its
//   description is the tagline in bold and the description. A business
//   without an address (the examples) gets its town and the coordinates
//   of a place already in its location, Tranemo's when it has none.
// - The menu becomes a list in the description of the offering it belongs
//   to: rooms under Boende, the shop's range under Försäljning, the rest
//   under Mat & fika.
// - Opening hours and their note go with every offering, except to Boende
//   when the place also serves food (a room is booked, not visited).
// - The contact goes with every offering. Examples stay examples.

const ADMIN = db.users.findOne({ username: 'lyret' }, { _id: 1 });
const CHARS = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
const newId = () =>
  Array.from({ length: 17 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const STAY = /^(rum|huset)$/i;
const SHOP = /butik|sortiment|från gården|bröd$/i;

const sectionKind = (title, kinds) => {
  if (kinds.length === 1) return kinds[0];
  if (kinds.includes('stay') && STAY.test(title)) return 'stay';
  if (kinds.includes('shop') && SHOP.test(title)) return 'shop';
  return kinds.includes('eat') ? 'eat' : kinds[0];
};

const escape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

const menuHtml = (sections) =>
  sections
    .map(
      (section) =>
        `<p><strong>${escape(section.title)}</strong></p><ul>${(section.items || [])
          .map(
            (item) =>
              `<li>${escape(item.name)}${item.description ? `, ${lowerFirst(escape(item.description))}` : ''}${
                item.price ? ` – ${escape(item.price)}` : ''
              }</li>`
          )
          .join('')}</ul>`
    )
    .join('');

// The town and coordinates of a place already in the location
const fallbackAddress = (locationId) => {
  const location = locationId && db.locations.findOne({ _id: locationId }, { name: 1 });
  const near =
    (locationId &&
      db.resources.findOne(
        { locationId, 'address.coordinates': { $exists: true } },
        { address: 1 }
      )) ||
    db.resources.findOne({ _id: '2MAK2auNt5NMHSpyt' }, { address: 1 });
  return {
    city: near.address.city || (location && location.name) || 'Tranemo',
    coordinates: near.address.coordinates,
  };
};

let created = 0;
let attached = 0;
let offerings = 0;
db.businesses.find().forEach((business) => {
  if (db.offerings.findOne({ legacyBusinessId: business._id })) {
    return;
  }
  const now = new Date();
  const kinds = business.kinds && business.kinds.length ? business.kinds : ['eat'];
  const existing = db.resources.findOne({ label: business.label }, { _id: 1 });
  let resourceId = existing && existing._id;
  if (resourceId) {
    attached += 1;
  } else {
    resourceId = newId();
    db.resources.insertOne({
      _id: resourceId,
      label: business.label,
      description: `${business.tagline ? `<p><strong>${escape(business.tagline)}</strong></p>` : ''}${
        business.description || ''
      }`,
      images: business.images || [],
      ...(business.locationId ? { locationId: business.locationId } : {}),
      address: business.address || fallbackAddress(business.locationId),
      managerIds: [],
      userId: ADMIN._id,
      createdBy: 'lyret',
      createdAt: business.createdAt || now,
    });
    created += 1;
  }

  const servesFood = kinds.includes('eat');
  kinds.forEach((kind) => {
    const sections = (business.menu || []).filter((s) => sectionKind(s.title, kinds) === kind);
    const withHours = !(kind === 'stay' && servesFood);
    const description = menuHtml(sections);
    db.offerings.insertOne({
      _id: newId(),
      resourceId,
      kind,
      ...(description ? { description } : {}),
      ...(business.contact ? { contact: business.contact } : {}),
      openingHours: withHours ? business.openingHours || [] : [],
      ...(withHours && business.hoursNote ? { hoursNote: business.hoursNote } : {}),
      ...(business.isExample ? { isExample: true } : {}),
      legacyBusinessId: business._id,
      createdBy: 'lyret',
      createdAt: now,
    });
    offerings += 1;
  });
});
print(`businesses: ${created} new places, ${attached} attached to existing places, ${offerings} offerings`);

// A commercial place's website and its contact person are now kept apart
// (resource.commerce.website, and website on an offering), so a place can
// show only a link to its own site.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-11-commerce-website.mongosh.js
//
// Idempotent: moves contact.website to website, and drops a contact left
// empty.

const split = (doc, path) => {
  const contact = path.split('.').reduce((o, k) => (o ? o[k] : undefined), doc);
  if (!contact || !contact.website) return null;
  const { website, ...person } = contact;
  const base = path.replace(/\.?contact$/, '');
  const prefix = base ? `${base}.` : '';
  return Object.keys(person).length
    ? { $set: { [`${prefix}website`]: website, [path]: person } }
    : { $set: { [`${prefix}website`]: website }, $unset: { [path]: 1 } };
};

let places = 0;
db.resources.find({ 'commerce.contact.website': { $exists: true } }).forEach((place) => {
  db.resources.updateOne({ _id: place._id }, split(place, 'commerce.contact'));
  places += 1;
});
let offerings = 0;
db.offerings.find({ 'contact.website': { $exists: true } }).forEach((offering) => {
  db.offerings.updateOne({ _id: offering._id }, split(offering, 'contact'));
  offerings += 1;
});
print(`websites moved: ${places} places, ${offerings} offerings`);

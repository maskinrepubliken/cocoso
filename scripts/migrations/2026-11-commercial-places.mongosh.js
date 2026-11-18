// A commercial place is now marked as such (resource.isCommercial) and has
// its own tagline, default contact and default opening hours
// (resource.commerce), instead of being commercial by having offerings.
// Offerings can be several of a kind and keep an order.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-11-commercial-places.mongosh.js
//
// Idempotent. For each place with offerings:
// - isCommercial is set;
// - a description that starts with a bold line on its own (how the
//   businesses migration kept the tagline) loses it to commerce.tagline;
// - its offerings get an order, in the order of the kinds (eat, stay,
//   service, shop).

const KINDS = ['eat', 'stay', 'service', 'shop'];
const LEAD = /^\s*<p>\s*<strong>([^<]+)<\/strong>\s*<\/p>/;

let places = 0;
let taglines = 0;
db.offerings.distinct('resourceId').forEach((resourceId) => {
  const place = db.resources.findOne({ _id: resourceId }, { description: 1, commerce: 1 });
  if (!place) return;
  const set = { isCommercial: true };
  const lead = (place.description || '').match(LEAD);
  if (lead && !(place.commerce && place.commerce.tagline)) {
    set['commerce.tagline'] = lead[1].trim();
    set.description = place.description.replace(LEAD, '');
    taglines += 1;
  }
  db.resources.updateOne({ _id: resourceId }, { $set: set });
  places += 1;

  db.offerings
    .find({ resourceId, order: { $exists: false } })
    .toArray()
    .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
    .forEach((offering, order) => db.offerings.updateOne({ _id: offering._id }, { $set: { order } }));
});
print(`commercial places: ${places}, taglines moved: ${taglines}`);

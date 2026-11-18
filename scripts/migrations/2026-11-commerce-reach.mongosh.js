// A commercial place, and an offering, is now reached in one chosen way,
// as places and bookings are: a manager (contactUserId), details of its
// own (contact), its website or a free note (contactNote). Where both a
// website and details of its own were kept, the website stays.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-11-commerce-reach.mongosh.js
//
// Idempotent. Prints what it drops.

let fixed = 0;
db.resources
  .find({ 'commerce.website': { $exists: true }, 'commerce.contact': { $exists: true } })
  .forEach((place) => {
    print(`${place.label}: keeps ${place.commerce.website}, drops ${JSON.stringify(place.commerce.contact)}`);
    db.resources.updateOne({ _id: place._id }, { $unset: { 'commerce.contact': 1 } });
    fixed += 1;
  });
db.offerings
  .find({ website: { $exists: true }, contact: { $exists: true } })
  .forEach((offering) => {
    print(`offering ${offering._id}: keeps ${offering.website}, drops ${JSON.stringify(offering.contact)}`);
    db.offerings.updateOne({ _id: offering._id }, { $unset: { contact: 1 } });
    fixed += 1;
  });
print(`reached one way: ${fixed} fixed`);

// Booking places in the calendar is gone (the `bookings` feature): places
// lose isBookable, isCombo and resourcesForCombo, events lose
// isExclusiveActivity, and the site forgets the feature's switch. A place
// still says how it is booked in `booking`, which is not touched.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-11-drop-calendar-bookings.mongosh.js
//
// Idempotent.

const places = db.resources.updateMany(
  {
    $or: [
      { isBookable: { $exists: true } },
      { isCombo: { $exists: true } },
      { resourcesForCombo: { $exists: true } },
    ],
  },
  { $unset: { isBookable: 1, isCombo: 1, resourcesForCombo: 1 } }
).modifiedCount;
const events = db.activities.updateMany(
  { isExclusiveActivity: { $exists: true } },
  { $unset: { isExclusiveActivity: 1 } }
).modifiedCount;
const site = db.site.updateMany(
  { 'features.bookings': { $exists: true } },
  { $unset: { 'features.bookings': 1 } }
).modifiedCount;
print(`resources: ${places} cleaned, activities: ${events} cleaned, site: ${site}`);

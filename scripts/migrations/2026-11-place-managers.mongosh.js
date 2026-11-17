// A place is looked after by a list of organizers, managerIds, instead of
// only the one who added it (userId). See canManagePlace in
// imports/api/resources/resource.methods.js.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-11-place-managers.mongosh.js
//
// Idempotent: only places without managerIds are touched. A place added by
// an organizer gets them as its manager; one added by an admin gets none
// (admins may change every place anyway, and an admin's own account should
// not be shown as the place's organizer).

const organizers = new Set(
  db.memberships.find({ role: 'contributor' }, { userId: 1 }).toArray().map((m) => m.userId)
);
let mine = 0;
let none = 0;
db.resources.find({ managerIds: { $exists: false } }, { userId: 1 }).forEach((place) => {
  const managerIds = organizers.has(place.userId) ? [place.userId] : [];
  db.resources.updateOne({ _id: place._id }, { $set: { managerIds } });
  if (managerIds.length) mine += 1;
  else none += 1;
});
print(`resources: ${mine} managed by the organizer who added them, ${none} by admins only`);

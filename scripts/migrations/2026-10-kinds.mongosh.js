/* global db */
// Events and places can be several kinds at once: the single kind in
// category.key becomes the list `kinds` (see imports/api/_utils/kinds.ts).
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-10-kinds.mongosh.js
//
// Idempotent: only documents with a kind in category.key and no kinds yet
// are touched. Works keep their own category ({ label, categoryId }), so
// only activities and resources are migrated.

for (const name of ['activities', 'resources']) {
  const coll = db.getCollection(name);
  const selector = { 'category.key': { $type: 'string' }, kinds: { $exists: false } };
  let moved = 0;
  coll.find(selector).forEach((doc) => {
    coll.updateOne(
      { _id: doc._id },
      { $set: { kinds: [doc.category.key] }, $unset: { category: 1 } }
    );
    moved += 1;
  });
  // A null category (an event saved without a kind) goes too
  const cleared = coll.updateMany(
    { category: { $type: "null" }, kinds: { $exists: false } },
    { $set: { kinds: [] }, $unset: { category: 1 } }
  ).modifiedCount;
  print(`${name}: ${moved} moved to kinds, ${cleared} without a kind`);
}

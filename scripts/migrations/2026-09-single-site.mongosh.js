// One-off migration to the single-site data model.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-09-single-site.mongosh.js
//
// Idempotent. Run it once after deploying the code that stops reading the
// `host` field. It:
//   - renames the `hosts` collection to `site` and strips tenant fields,
//   - removes `host` (and friends) from every content collection,
//   - drops the platform and SSO collections,
//   - rebuilds the memberships indexes for one membership per user.

const CONTENT = [
  'activities',
  'resources',
  'groups',
  'works',
  'pages',
  'composablepages',
  'categories',
  'keywords',
  'newsletters',
  'chats',
  'documents',
  'images',
  'reports',
  'memberships',
];

const names = db.getCollectionNames();

if (names.includes('hosts') && !names.includes('site')) {
  db.hosts.renameCollection('site');
  print('renamed hosts -> site');
}
if (db.getCollectionNames().includes('site')) {
  const r = db.site.updateMany(
    {},
    {
      $unset: {
        host: 1,
        isPortalHost: 1,
        registeredBy: 1,
        verifiedBy: 1,
        unVerifiedBy: 1,
        members: 1,
      },
    }
  );
  print(`site: cleaned ${r.modifiedCount} document(s)`);
}

for (const name of CONTENT) {
  if (!db.getCollectionNames().includes(name)) continue;
  const unset = { host: 1 };
  if (name === 'keywords') unset.hostname = 1;
  if (name === 'newsletters') unset.hostId = 1;
  const r = db[name].updateMany({ $or: Object.keys(unset).map((k) => ({ [k]: { $exists: true } })) }, { $unset: unset });
  print(`${name}: unset on ${r.modifiedCount} document(s)`);
}

const u = db.users.updateMany(
  {},
  {
    $unset: {
      isSuperAdmin: 1,
      verifiedBy: 1,
      unVerifiedBy: 1,
      memberships: 1,
      'notifications.$[].host': 1,
    },
  }
);
print(`users: cleaned ${u.modifiedCount} document(s)`);

for (const name of ['platform', 'ssoAuthorizationCodes', 'ssoMagicLinkTokens', 'membershipConflictReports', 'migrations']) {
  if (db.getCollectionNames().includes(name)) {
    db[name].drop();
    print(`dropped ${name}`);
  }
}

// Memberships: one document per user.
const dupes = db.memberships
  .aggregate([{ $group: { _id: '$userId', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }])
  .toArray();
if (dupes.length) {
  print(`WARNING: ${dupes.length} user(s) have several memberships; keeping the highest role of each`);
  const rank = { admin: 3, contributor: 2, participant: 1 };
  for (const d of dupes) {
    const docs = db.memberships.find({ userId: d._id }).toArray().sort((a, b) => (rank[b.role] || 0) - (rank[a.role] || 0));
    db.memberships.deleteMany({ userId: d._id, _id: { $ne: docs[0]._id } });
  }
}
for (const idx of ['userId_host_unique', 'host_role']) {
  try {
    db.memberships.dropIndex(idx);
    print(`dropped index ${idx}`);
  } catch (e) {
    // already gone
  }
}
db.memberships.createIndex({ userId: 1 }, { unique: true, name: 'userId_unique' });
db.memberships.createIndex({ role: 1 }, { name: 'role' });
print('memberships indexes rebuilt');
print('done');

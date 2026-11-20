// Organizer profiles without a login are aliases: `isAlias: true` on the
// user and no email address. See imports/api/users/user.alias.js.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-11-alias-organizers.mongosh.js
//
// Until now such profiles were seeded with a made-up address at
// example.org (scripts/seed). Those become aliases: the placeholder
// address and any login tokens are removed, everything else — username,
// profile, events — stays as it is.
//
// Idempotent: an alias has no address left to match. Accounts with a
// password, admins and every real address are left alone. Set DRY_RUN=1
// to only list what would change:
//
//   DRY_RUN=1 mongosh "mongodb://mongo:27017/cocoso" --file scripts/migrations/2026-11-alias-organizers.mongosh.js

const dryRun = Boolean(process.env.DRY_RUN);
const admins = db.memberships.find({ role: 'admin' }, { userId: 1 }).toArray().map((m) => m.userId);
const selector = {
  _id: { $nin: admins },
  'emails.address': /@example\.org$/i,
  'services.password': { $exists: false },
};
const found = db.users.find(selector, { username: 1, emails: 1 }).toArray();
found.forEach((user) => print(`  ${user.username} (${user.emails[0].address})`));
if (!dryRun && found.length) {
  db.users.updateMany(
    { _id: { $in: found.map((user) => user._id) } },
    { $set: { isAlias: true, services: {} }, $unset: { emails: '' } }
  );
}
print(`users: ${found.length} ${dryRun ? 'would become' : 'made'} aliases`);

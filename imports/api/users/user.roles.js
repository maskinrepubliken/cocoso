import { Meteor } from 'meteor/meteor';

import Memberships from '../memberships/membership';

// Roles are per site: a user has at most one membership document.
const hasRole = async (userId, roles) => {
  if (!userId) {
    return false;
  }
  return Boolean(
    await Memberships.findOneAsync({ userId, role: { $in: roles } })
  );
};

const isAdmin = async (userId) => hasRole(userId, ['admin']);
const isContributorOrAdmin = async (userId) =>
  hasRole(userId, ['admin', 'contributor']);
const isContributor = async (userId) => hasRole(userId, ['contributor']);
const isParticipant = async (userId) => hasRole(userId, ['participant']);
const isMember = async (userId) => {
  if (!userId) {
    return false;
  }
  return Boolean(await Memberships.findOneAsync({ userId }));
};

// Aliases (organizer profiles without a login, user.alias.js) are the
// admins' to hand out. Of these user ids, the ones this user may name as
// an organizer or a place's manager: an admin all of them, anyone else
// none of the aliases, except those `already` named there.
const withoutNewAliases = async (ids, userId, already = []) => {
  if (ids.length === 0 || (await isAdmin(userId))) {
    return ids;
  }
  const aliases = await Meteor.users
    .find({ _id: { $in: ids }, isAlias: true }, { fields: { _id: 1 } })
    .fetchAsync();
  const refused = new Set(
    aliases.map((alias) => alias._id).filter((id) => !already.includes(id))
  );
  return ids.filter((id) => !refused.has(id));
};

export {
  isAdmin,
  isContributorOrAdmin,
  isContributor,
  isParticipant,
  isMember,
  withoutNewAliases,
};

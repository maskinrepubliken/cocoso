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

export { isAdmin, isContributorOrAdmin, isContributor, isParticipant, isMember };

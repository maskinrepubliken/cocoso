import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import Resources from './resource';

// Who may change a place (and what it offers): admins, its managers, and
// the managers of the place it is part of (the library's look after its
// rooms). The browser's side is placeAccess.ts.
export default async function canManagePlace(userId, resource) {
  if (await isAdmin(userId)) {
    return true;
  }
  if (!(await isContributorOrAdmin(userId))) {
    return false;
  }
  if ((resource.managerIds || []).includes(userId)) {
    return true;
  }
  if (!resource.parentId) {
    return false;
  }
  const parent = await Resources.findOneAsync(
    { _id: resource.parentId },
    { fields: { managerIds: 1 } }
  );
  return Boolean(parent?.managerIds?.includes(userId));
}

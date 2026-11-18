interface ManagedPlace {
  managerIds?: string[] | null;
  // The place it is part of, as getResourceById sends it
  partOf?: { managerIds?: string[] | null } | null;
}

// Whether this organizer looks after the place, or the place it is part of:
// the browser's side of canManagePlace in resource.access.js, to show the
// pens. Admins may change every place besides.
export const managesPlace = (
  userId: string | null | undefined,
  place: ManagedPlace | null | undefined
): boolean =>
  Boolean(
    userId &&
      place &&
      ((place.managerIds || []).includes(userId) ||
        (place.partOf?.managerIds || []).includes(userId))
  );

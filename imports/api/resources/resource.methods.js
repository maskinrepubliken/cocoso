import { Meteor } from 'meteor/meteor';
import dayjs from 'dayjs';
import { check, Match } from 'meteor/check';
import { locationSelector } from '../_utils/shared';
import { requireAddress } from '../_utils/address';
import { withCoordinates } from '../_utils/geocode';

import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import Resources from './resource';
import Memberships from '../memberships/membership';
import { attachBookingPerson, cleanBooking } from './resource.booking';
import { attachPlaceContact, cleanPlaceContact } from './resource.contact';
import Activities from '../activities/activity';
import { cleanKinds } from '../_utils/kinds';
import { RESOURCE_KIND_KEYS } from '../../ui/pages/resources/resourceKinds';
import { warmShareImage } from '../share/shareImage.server';
import methodError from '../_utils/methodError';

async function validateLabel(label, resourceId) {
  // set resource query
  const resourceQuery = { label };
  if (resourceId) resourceQuery._id = { $ne: resourceId };
  // validate label
  if (label.length < 3) {
    throw new Meteor.Error(
      'Resource name is too short. Minimum 3 letters required'
    );
  } else if ((await Resources.find(resourceQuery).countAsync()) > 0) {
    throw new Meteor.Error('There already is a resource with this name');
  }
  return true;
}

// Only the known kinds are stored.
function cleanResourceKinds(kinds) {
  check(kinds, Match.Maybe([String]));
  return cleanKinds(kinds, RESOURCE_KIND_KEYS);
}

// The place a place is part of, or null. It must exist and must not be
// the place itself or one of its own parts.
async function findParent(parentId, resourceId) {
  check(parentId, Match.Maybe(String));
  if (!parentId) {
    return null;
  }
  const parent = await Resources.findOneAsync(
    { _id: parentId },
    { fields: { address: 1, locationId: 1, parentId: 1, isUnlisted: 1 } }
  );
  if (!parent) {
    throw new Meteor.Error('parent-not-found', 'The parent place is gone');
  }
  // A place left out of the list (a room, say) has no parts of its own
  if (parent.isUnlisted) {
    throw new Meteor.Error(
      'parent-is-unlisted',
      'A place cannot be part of a place left out of the list'
    );
  }
  if (resourceId) {
    let above = parent;
    for (let depth = 0; above && depth < 20; depth += 1) {
      if (above._id === resourceId) {
        throw new Meteor.Error(
          'parent-is-part',
          'A place cannot be part of itself or of one of its parts'
        );
      }
      above = above.parentId
        ? await Resources.findOneAsync(
            { _id: above.parentId },
            { fields: { parentId: 1 } }
          )
        : null;
    }
  }
  return parent;
}

// Who may change a place: admins, its managers, and the managers of the
// place it is part of (the library's look after its rooms).
async function canManagePlace(userId, resource) {
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

// The managers as given: organizers or admins, each once.
async function cleanManagers(managerIds) {
  check(managerIds, Match.Maybe([String]));
  const ids = [...new Set(managerIds || [])];
  const kept = [];
  for (const id of ids) {
    if (await isContributorOrAdmin(id)) {
      kept.push(id);
    }
  }
  return kept;
}

// The parts of a place have its address and location: after the place
// changes, they and their own parts (and the events held there) follow.
async function updateParts(resourceId, address, locationId) {
  const parts = await Resources.find(
    { parentId: resourceId },
    { fields: { _id: 1 } }
  ).fetchAsync();
  for (const part of parts) {
    await Resources.updateAsync(
      { _id: part._id },
      locationId
        ? { $set: { address, locationId } }
        : { $set: { address }, $unset: { locationId: 1 } }
    );
    await Activities.updateAsync(
      { resourceId: part._id },
      locationId ? { $set: { locationId } } : { $unset: { locationId: 1 } },
      { multi: true }
    );
    await updateParts(part._id, address, locationId);
  }
}

// RESOURCE METHODS
Meteor.methods({
  async getResources(locationId) {
    check(locationId, Match.Maybe(String));
    const fields = Resources.publicFields;
    return await Resources.find(locationSelector(locationId), {
      fields,
      sort: { createdAt: -1 },
    }).fetchAsync();
  },

  async getResourcesDry() {
    return await Resources.find(
      {},
      {
        fields: {
          _id: 1,
          address: 1,
          category: 1,
          kinds: 1,
          label: 1,
          // how to book it, for "Bokningsbar" in the place picker
          booking: 1,
          locationId: 1,
          parentId: 1,
          isUnlisted: 1,
          // a picture for the place picker in the event form
          images: { $slice: 1 },
          imageUrl: 1,
        },
        sort: { createdAt: -1 },
      }
    ).fetchAsync();
  },

  async getResourceById(resourceId) {
    const fields = Resources.publicFields;
    const resource = await attachPlaceContact(
      await attachBookingPerson(
        await Resources.findOneAsync(resourceId, { fields })
      )
    );
    if (!resource) {
      return resource;
    }
    // The page links up to the place it is part of and down to its parts,
    // both as small cards with a picture and whether they can be booked
    const card = {
      _id: 1,
      label: 1,
      images: { $slice: 1 },
      booking: 1,
      isUnlisted: 1,
      // the parent's address shows under "Del av"
      address: 1,
      // its managers look after its parts too
      managerIds: 1,
    };
    const [partOf, parts] = await Promise.all([
      resource.parentId
        ? Resources.findOneAsync({ _id: resource.parentId }, { fields: card })
        : null,
      Resources.find(
        { parentId: resource._id },
        { fields: card, sort: { label: 1 } }
      ).fetchAsync(),
    ]);
    return { ...resource, partOf: partOf || null, parts };
  },

  // The organizers linked to a place, for "Se även" on its page: those who
  // look after it, the one it is booked through, and those who have it as
  // their place. Only organizers shown publicly, as on the Arrangörer page.
  async getPlaceOrganizers(resourceId) {
    check(resourceId, String);
    const place = await Resources.findOneAsync(
      { _id: resourceId },
      { fields: { managerIds: 1, 'booking.contactUserId': 1 } }
    );
    if (!place) {
      return [];
    }
    const basedHere = await Meteor.users
      .find({ homePlaceId: resourceId }, { fields: { _id: 1 } })
      .fetchAsync();
    const ids = [
      ...new Set([
        ...(place.managerIds || []),
        ...(place.booking?.contactUserId ? [place.booking.contactUserId] : []),
        ...basedHere.map((user) => user._id),
      ]),
    ];
    const shown = await Memberships.find(
      { userId: { $in: ids }, isPublic: true, isOrganizer: true },
      { fields: { userId: 1 } }
    ).fetchAsync();
    const users = await Meteor.users
      .find(
        { _id: { $in: shown.map((m) => m.userId) } },
        { fields: { username: 1, firstName: 1, lastName: 1, avatar: 1 } }
      )
      .fetchAsync();
    return users
      .map((user) => ({
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar?.src || null,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
  },

  // The places an organizer is linked to, for their page: the place they
  // are based at (homePlaceId) whole, with its parts; those they look after
  // or are booked through as small cards.
  async getPlacesOfOrganizer(username) {
    check(username, String);
    const user = await Meteor.users.findOneAsync(
      { username },
      { fields: { _id: 1, homePlaceId: 1 } }
    );
    if (!user) {
      return { main: null, others: [] };
    }
    const linked = await Resources.find(
      {
        $or: [
          ...(user.homePlaceId ? [{ _id: user.homePlaceId }] : []),
          { managerIds: user._id },
          { 'booking.contactUserId': user._id },
        ],
        isUnlisted: { $ne: true },
      },
      {
        fields: {
          _id: 1,
          label: 1,
          images: { $slice: 1 },
          booking: 1,
        },
        sort: { label: 1 },
      }
    ).fetchAsync();
    // Only the place they are based at is shown whole; the ones they look
    // after or are booked through come as small cards
    const home = linked.find((place) => place._id === user.homePlaceId);
    if (!home) {
      return { main: null, others: linked };
    }
    const main = await attachPlaceContact(
      await attachBookingPerson(
        await Resources.findOneAsync(home._id, {
          fields: Resources.publicFields,
        })
      )
    );
    const parts = await Resources.find(
      { parentId: home._id },
      { fields: { _id: 1, label: 1, isUnlisted: 1 }, sort: { label: 1 } }
    ).fetchAsync();
    return {
      main: main ? { ...main, parts } : null,
      others: linked.filter((place) => place._id !== home._id),
    };
  },

  async createResource(values) {
    check(values, Match.ObjectIncluding({ label: String }));
    const user = await Meteor.userAsync();
    // Organizers and admins add places; only admins remove them.
    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await validateLabel(values.label);
    // A part of another place is where that place is
    const parent = await findParent(values.parentId);
    const address = parent
      ? parent.address
      : await withCoordinates(requireAddress(values.address));
    const locationId = parent ? parent.locationId : values.locationId;
    const kinds = cleanResourceKinds(values.kinds);
    const booking = await cleanBooking(values.booking);
    // An organizer who adds a place must look after it, so no one adds
    // places nobody answers for; admins need not be named
    const userIsAdmin = await isAdmin(user._id);
    const managerIds = await cleanManagers(
      values.managerIds || (userIsAdmin ? [] : [user._id])
    );
    if (!userIsAdmin && !managerIds.includes(user._id)) {
      throw new Meteor.Error(
        'must-manage',
        'An organizer adding a place must be one of its managers'
      );
    }
    // One of its managers, details of its own, or none
    const contactFields = await cleanPlaceContact(values, managerIds);
    const {
      contact: _contact,
      contactUserId: _contactUserId,
      category: _category,
      kinds: _kinds,
      booking: _booking,
      parentId: _parentId,
      isUnlisted: _isUnlisted,
      managerIds: _managerIds,
      ...rest
    } = values;
    try {
      const newResourceId = await Resources.insertAsync({
        ...rest,
        address,
        ...contactFields,
        ...(booking ? { booking } : {}),
        ...(parent ? { parentId: parent._id } : {}),
        ...(parent && values.isUnlisted ? { isUnlisted: true } : {}),
        kinds,
        managerIds,
        locationId: locationId || undefined,
        userId: user._id,
        createdBy: user.username,
        createdAt: new Date(),
      });
      await Meteor.callAsync(
        'createChat',
        values.label,
        newResourceId,
        'resources'
      );
      warmShareImage('resource', newResourceId);
      return newResourceId;
    } catch (error) {
      throw methodError(error);
    }
  },

  async updateResource(resourceId, values) {
    check(resourceId, String);
    check(values, Match.ObjectIncluding({ label: String }));
    const user = await Meteor.userAsync();
    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }

    const resource = await Resources.findOneAsync({ _id: resourceId });
    if (!resource) {
      throw new Meteor.Error('not-found', 'Resource not found');
    }
    if (!(await canManagePlace(user._id, resource))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await validateLabel(values.label, resourceId);

    // A part of another place is where that place is
    const parent = await findParent(values.parentId, resourceId);
    const address = parent
      ? parent.address
      : await withCoordinates(requireAddress(values.address));
    const locationId = parent ? parent.locationId : values.locationId;
    const isUnlisted = Boolean(parent && values.isUnlisted);
    const kinds = cleanResourceKinds(values.kinds);
    const booking = await cleanBooking(values.booking);
    const managerIds =
      values.managerIds === undefined
        ? undefined
        : await cleanManagers(values.managerIds);
    // One of its managers (as they will be), details of its own, or none
    const contactFields = await cleanPlaceContact(
      values,
      managerIds || resource.managerIds || []
    );
    const {
      _id,
      userId,
      createdBy,
      managerIds: _managerIds,
      locationId: _locationId,
      parentId: _parentId,
      isUnlisted: _isUnlisted,
      partOf: _partOf,
      parts: _parts,
      contact: _contact,
      contactUserId: _contactUserId,
      category: _category,
      kinds: _kinds,
      booking: _booking,
      ...safeValues
    } = values;

    const unset = {
      ...(contactFields.contact ? {} : { contact: 1 }),
      ...(contactFields.contactUserId ? {} : { contactUserId: 1 }),
      ...(booking ? {} : { booking: 1 }),
      // the single kind from before kinds
      category: 1,
      ...(locationId ? {} : { locationId: 1 }),
      ...(parent ? {} : { parentId: 1 }),
      ...(isUnlisted ? {} : { isUnlisted: 1 }),
    };

    try {
      await Resources.updateAsync(resourceId, {
        $set: {
          ...safeValues,
          address,
          ...contactFields,
          ...(booking ? { booking } : {}),
          ...(parent ? { parentId: parent._id } : {}),
          ...(isUnlisted ? { isUnlisted } : {}),
          kinds,
          ...(managerIds ? { managerIds } : {}),
          ...(locationId ? { locationId } : {}),
          updatedBy: user.username,
          updatedAt: new Date(),
        },
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      });
      warmShareImage('resource', resourceId);
      // Activities held at this resource follow it.
      await Activities.updateAsync(
        { resourceId },
        locationId ? { $set: { locationId } } : { $unset: { locationId: 1 } },
        { multi: true }
      );
      await updateParts(resourceId, address, locationId);
    } catch (error) {
      throw methodError(error, "Couldn't add to Collection");
    }
  },

  async deleteResource(resourceId) {
    check(resourceId, String);
    const user = await Meteor.userAsync();

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }

    const resource = await Resources.findOneAsync(resourceId, {
      fields: { address: 1 },
    });
    if (!resource) {
      throw new Meteor.Error('not-found', 'Place not found');
    }

    const heldHere = { resourceId };

    // Refuse while events are still to come, so nobody turns up at a place
    // that has vanished from the site. Move or remove them first.
    const today = dayjs().format('YYYY-MM-DD');
    const upcoming = await Activities.find({
      ...heldHere,
      'datesAndTimes.endDate': { $gte: today },
    }).countAsync();
    if (upcoming > 0) {
      throw new Meteor.Error(
        'place-has-upcoming',
        `${upcoming} upcoming event(s) are held at this place`,
        { count: upcoming }
      );
    }

    // Past events stay as they were held: they keep the place's name and
    // take over its address, but no longer link to a page that is gone.
    if (resource.address) {
      await Activities.updateAsync(
        { ...heldHere, address: null },
        { $set: { address: resource.address } },
        { multi: true }
      );
    }
    await Activities.updateAsync(
      heldHere,
      { $unset: { resourceId: '' } },
      { multi: true }
    );

    // Its parts stay where they are, as places of their own, and are
    // listed again
    await Resources.updateAsync(
      { parentId: resourceId },
      { $unset: { parentId: 1, isUnlisted: 1 } },
      { multi: true }
    );

    try {
      await Resources.removeAsync({ _id: resourceId });
    } catch (error) {
      throw methodError(error, "Couldn't remove from collection");
    }
  },
});

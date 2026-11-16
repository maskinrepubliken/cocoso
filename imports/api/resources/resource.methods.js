import { Meteor } from 'meteor/meteor';
import dayjs from 'dayjs';
import { check, Match } from 'meteor/check';
import { locationSelector } from '../_utils/shared';
import { requireAddress } from '../_utils/address';
import { cleanContact } from '../_utils/contact';
import { withCoordinates } from '../_utils/geocode';

import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import Resources from './resource';
import { attachBookingPerson, cleanBooking } from './resource.booking';
import Activities from '../activities/activity';
import { cleanKinds } from '../_utils/kinds';
import { RESOURCE_KIND_KEYS } from '../../ui/pages/resources/resourceKinds';
import { warmShareImage } from '../share/shareImage.server';

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
    { fields: { address: 1, locationId: 1, parentId: 1 } }
  );
  if (!parent) {
    throw new Meteor.Error('parent-not-found', 'The parent place is gone');
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
          isBookable: 1,
          isCombo: 1,
          locationId: 1,
          parentId: 1,
          resourcesForCombo: 1,
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
    const resource = await attachBookingPerson(
      await Resources.findOneAsync(resourceId, { fields })
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
      isBookable: 1,
      booking: 1,
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

  async getResourceBookingsForUser(resourceId) {
    const user = await Meteor.userAsync();

    if (!(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('Not valid user!');
    }

    try {
      const bookings = await Activities.find(
        {
          resourceId,
          authorId: user._id,
        },
        {
          fields: {
            title: 1,
            longDescription: 1,
            datesAndTimes: 1,
          },
        }
      ).fetchAsync();

      const userBookings = bookings.map((booking) => ({
        _id: booking._id,
        startDate: booking.datesAndTimes[0].startDate,
        startTime: booking.datesAndTimes[0].startTime,
        endDate: booking.datesAndTimes[0].endDate,
        endTime: booking.datesAndTimes[0].endTime,
        title: booking.title,
        description: booking.longDescription,
      }));

      return userBookings;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't fetch bookings");
    }
  },

  async createResource(values) {
    check(values, Match.ObjectIncluding({ label: String }));
    const user = await Meteor.userAsync();
    // Organizers add and edit places; only admins remove them.
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
    const contact = cleanContact(values.contact);
    const kinds = cleanResourceKinds(values.kinds);
    const booking = await cleanBooking(values.booking);
    const {
      contact: _contact,
      category: _category,
      kinds: _kinds,
      booking: _booking,
      parentId: _parentId,
      isUnlisted: _isUnlisted,
      ...rest
    } = values;
    try {
      const newResourceId = await Resources.insertAsync({
        ...rest,
        address,
        ...(contact ? { contact } : {}),
        ...(booking ? { booking } : {}),
        ...(parent ? { parentId: parent._id } : {}),
        ...(parent && values.isUnlisted ? { isUnlisted: true } : {}),
        kinds,
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
      throw new Meteor.Error(error);
    }
  },

  async updateResource(resourceId, values) {
    check(resourceId, String);
    check(values, Match.ObjectIncluding({ label: String }));
    const user = await Meteor.userAsync();
    // Organizers add and edit places; only admins remove them.
    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await validateLabel(values.label, resourceId);

    const resource = await Resources.findOneAsync({ _id: resourceId });
    if (!resource) {
      throw new Meteor.Error('not-found', 'Resource not found');
    }

    // A part of another place is where that place is
    const parent = await findParent(values.parentId, resourceId);
    const address = parent
      ? parent.address
      : await withCoordinates(requireAddress(values.address));
    const locationId = parent ? parent.locationId : values.locationId;
    const isUnlisted = Boolean(parent && values.isUnlisted);
    const contact = cleanContact(values.contact);
    const kinds = cleanResourceKinds(values.kinds);
    const booking = await cleanBooking(values.booking);
    const {
      _id,
      userId,
      createdBy,
      locationId: _locationId,
      parentId: _parentId,
      isUnlisted: _isUnlisted,
      partOf: _partOf,
      parts: _parts,
      contact: _contact,
      category: _category,
      kinds: _kinds,
      booking: _booking,
      ...safeValues
    } = values;

    const unset = {
      ...(contact ? {} : { contact: 1 }),
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
          ...(contact ? { contact } : {}),
          ...(booking ? { booking } : {}),
          ...(parent ? { parentId: parent._id } : {}),
          ...(isUnlisted ? { isUnlisted } : {}),
          kinds,
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
      if (
        !resource.isCombo &&
        (await Resources.findOneAsync({
          'resourcesForCombo._id': resource._id,
        }))
      ) {
        await Resources.updateAsync(
          { 'resourcesForCombo._id': resource._id },
          {
            $set: {
              'resourcesForCombo.$.label': values.label,
            },
          },
          {
            multi: true,
          }
        );
      }
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't add to Collection");
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
      throw new Meteor.Error(error, "Couldn't remove from collection");
    }
  },
});

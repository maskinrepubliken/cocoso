import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { locationSelector } from '../_utils/shared';

import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import Resources from './resource';
import Activities from '../activities/activity';

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

// RESOURCE METHODS
Meteor.methods({
  async getResources(locationId) {
    check(locationId, Match.Maybe(String));
    const fields = Resources.publicFields;
    return await Resources.find(
      locationSelector(locationId),
      {
        fields,
        sort: { createdAt: -1 },
      }
    ).fetchAsync();
  },

  async getResourcesDry() {

    return await Resources.find(
      {},
      {
        fields: {
          _id: 1,
          label: 1,
          isBookable: 1,
          isCombo: 1,
          locationId: 1,
          resourcesForCombo: 1,
        },
        sort: { createdAt: -1 },
      }
    ).fetchAsync();
  },

  async getResourceById(resourceId) {
    const fields = Resources.publicFields;
    return await Resources.findOneAsync(resourceId, { fields });
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
    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await validateLabel(values.label);
    try {
      const newResourceId = await Resources.insertAsync({
        ...values,
        locationId: values.locationId || undefined,
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
      return newResourceId;
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async updateResource(resourceId, values) {
    check(resourceId, String);
    check(values, Match.ObjectIncluding({ label: String }));
    const user = await Meteor.userAsync();
    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await validateLabel(values.label, resourceId);

    const resource = await Resources.findOneAsync({ _id: resourceId });
    if (!resource) {
      throw new Meteor.Error('not-found', 'Resource not found');
    }

    const { _id, userId, createdBy, locationId, ...safeValues } = values;

    try {
      await Resources.updateAsync(resourceId, {
        $set: {
          ...safeValues,
          ...(locationId ? { locationId } : {}),
          updatedBy: user.username,
          updatedAt: new Date(),
        },
        ...(locationId ? {} : { $unset: { locationId: 1 } }),
      });
      // Activities held at this resource follow it.
      await Activities.updateAsync(
        { resourceId },
        locationId
          ? { $set: { locationId } }
          : { $unset: { locationId: 1 } },
        { multi: true }
      );
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

    try {
      await Resources.removeAsync({ _id: resourceId });
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't remove from collection");
    }
  },
});

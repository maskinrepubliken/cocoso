import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { getHost } from '../_utils/shared';

import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import Resources from './resource';
import Activities from '../activities/activity';

async function validateLabel(label, host, resourceId) {
  // set resource query
  const resourceQuery = { host, label };
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
  async getResources(hostPredefined) {
    const host = hostPredefined || getHost(this);

    const fields = Resources.publicFields;
    return await Resources.find(
      { host },
      {
        fields,
        sort: { createdAt: -1 },
      }
    ).fetchAsync();
  },

  async getResourcesDry(hostPredefined) {
    const host = hostPredefined || getHost(this);

    return await Resources.find(
      { host },
      {
        fields: {
          _id: 1,
          host: 1,
          label: 1,
          isBookable: 1,
          isCombo: 1,
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

  async getResourceBookingsForUser(resourceId, hostPredefined) {
    const user = await Meteor.userAsync();
    const host = hostPredefined || getHost(this);

    if (!(await isContributorOrAdmin(user._id, host))) {
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
    const host = getHost(this);
    if (!user || !(await isAdmin(user._id, host))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await validateLabel(values.label, host);
    try {
      const newResourceId = await Resources.insertAsync({
        ...values,
        host,
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
    const host = getHost(this);
    if (!user || !(await isAdmin(user._id, host))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await validateLabel(values.label, host, resourceId);

    const resource = await Resources.findOneAsync({ _id: resourceId, host });
    if (!resource) {
      throw new Meteor.Error('not-found', 'Resource not found');
    }

    const { _id, host: _host, userId, createdBy, ...safeValues } = values;

    try {
      await Resources.updateAsync(resourceId, {
        $set: {
          ...safeValues,
          updatedBy: user.username,
          updatedAt: new Date(),
        },
      });
      if (
        !resource.isCombo &&
        (await Resources.findOneAsync({
          host,
          'resourcesForCombo._id': resource._id,
        }))
      ) {
        await Resources.updateAsync(
          { host, 'resourcesForCombo._id': resource._id },
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
    const host = getHost(this);

    if (!user || !(await isAdmin(user._id, host))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }

    try {
      await Resources.removeAsync({ _id: resourceId, host });
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't remove from collection");
    }
  },
});

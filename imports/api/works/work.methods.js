import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { locationSelector } from '../_utils/shared';

import Works from './work';
import { isContributorOrAdmin } from '../users/user.roles';

Meteor.methods({
  async getAllWorks(locationId) {
    check(locationId, Match.Maybe(String));
    try {
      return await Works.find(locationSelector(locationId), {
        sort: { creationDate: -1 },
      }).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error, 'Could not retrieve data');
    }
  },

  async getWorksByUser(username) {
    if (!username) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      return await Works.find({
        authorUsername: username,
      }).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't fetch works");
    }
  },

  async getMyWorks() {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      return await Works.find({
        authorId: user._id,
      }).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't fetch works");
    }
  },

  async getWorkById(workId, username) {

    try {
      const work = await Works.findOneAsync({ _id: workId });
      if (work && work.authorUsername !== username) {
        throw new Meteor.Error('Not allowed!');
      }
      return work;
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async createWork(values) {
    const user = await Meteor.userAsync();

    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const userAvatar = user.avatar ? user.avatar.src : null;

    try {
      const newWorkId = await Works.insertAsync({
        ...values,
        locationId: values.locationId || undefined,
        authorId: user._id,
        authorAvatar: userAvatar,
        authorUsername: user.username,
        creationDate: new Date(),
      });
      return newWorkId;
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async updateWork(workId, values) {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    const theWork = await Works.findOneAsync(workId);

    if (user._id !== theWork.authorId) {
      throw new Meteor.Error('You are not allowed');
    }

    const { locationId, ...safeValues } = values;

    try {
      await Works.updateAsync(workId, {
        $set: {
          ...safeValues,
          ...(locationId ? { locationId } : {}),
          latestUpdate: new Date(),
        },
        ...(locationId ? {} : { $unset: { locationId: 1 } }),
      });
      return values.title;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't add to Collection");
    }
  },

  async deleteWork(workId) {
    const user = await Meteor.userAsync();

    if (!user) {
      throw new Meteor.Error('You are not allowed!');
    }
    const userId = user._id;

    const work = await Works.findOneAsync(workId);
    if (work.authorId !== userId) {
      throw new Meteor.Error('You are not allowed!');
    }

    try {
      await Works.removeAsync(workId);
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't remove from collection");
    }
  },
});

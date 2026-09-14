import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import ComposablePages from './composablepage';
import { getHost } from '../_utils/shared';
import { isAdmin } from '../users/user.roles';

Meteor.methods({
  async getComposablePageById(composablePageId, hostPredefined) {
    const host = hostPredefined || getHost(this);

    try {
      return await ComposablePages.findOneAsync(
        {
          _id: composablePageId,
          host,
        },
        {
          fields: {
            _id: 1,
            authorUsername: 1,
            authorName: 1,
            contentRows: 1,
            description: 1,
            host: 1,
            isPublished: 1,
            settings: 1,
            title: 1,
          },
        }
      );
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async getComposablePages(hostPredefined) {
    const host = hostPredefined || getHost(this);

    try {
      return await ComposablePages.find({
        host,
      }).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async getComposablePageTitles(hostPredefined) {
    const host = hostPredefined || getHost(this);

    try {
      return await ComposablePages.find(
        {
          host,
        },
        {
          sort: {
            latestUpdate: -1,
          },
          fields: {
            _id: 1,
            authorName: 1,
            authorUsername: 1,
            creationDate: 1,
            host: 1,
            isPublished: 1,
            latestUpdate: 1,
            latestUpdateAuthorUsername: 1,
            title: 1,
          },
        }
      ).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async createComposablePage(formValues) {
    check(formValues, Match.ObjectIncluding({ title: String }));
    const user = await Meteor.userAsync();
    const host = getHost(this);

    if (!user || !(await isAdmin(user._id, host))) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      const newId = await ComposablePages.insertAsync({
        ...formValues,
        contentRows: [],
        settings: {
          hideTitle: false,
          hideMenu: false,
        },
        host,
        authorId: user._id,
        authorUsername: user.username,
        isPublished: false,
        creationDate: new Date(),
        latestUpdate: new Date(),
      });
      return newId;
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async updateComposablePage(formValues) {
    check(formValues, Match.ObjectIncluding({ _id: String }));
    const user = await Meteor.userAsync();
    const host = getHost(this);

    if (!user || !(await isAdmin(user._id, host))) {
      throw new Meteor.Error('Not allowed!');
    }

    const composablePageId = formValues._id;
    const thePage = await ComposablePages.findOneAsync({
      _id: composablePageId,
      host,
    });

    if (!thePage) {
      throw new Meteor.Error('Page not found');
    }

    const {
      _id,
      host: _host,
      authorId,
      authorUsername,
      ...safeValues
    } = formValues;

    try {
      await ComposablePages.updateAsync(composablePageId, {
        $set: {
          ...safeValues,
          latestUpdate: new Date(),
          latestUpdateAuthorId: user._id,
          latestUpdateAuthorUsername: user.username,
        },
      });
      return formValues.title;
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async publishComposablePage(composablePageId) {
    const user = await Meteor.userAsync();
    const host = getHost(this);

    if (!user || !(await isAdmin(user._id, host))) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      await ComposablePages.updateAsync(
        { _id: composablePageId, host },
        { $set: { isPublished: true } }
      );
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async unpublishComposablePage(composablePageId) {
    const user = await Meteor.userAsync();
    const host = getHost(this);

    if (!user || !(await isAdmin(user._id, host))) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      await ComposablePages.updateAsync(
        { _id: composablePageId, host },
        { $set: { isPublished: false } }
      );
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async deleteComposablePage(composablePageId) {
    const user = await Meteor.userAsync();
    const host = getHost(this);

    if (!user || !(await isAdmin(user._id, host))) {
      throw new Meteor.Error('Not allowed!');
    }

    const thePage = await ComposablePages.findOneAsync({
      _id: composablePageId,
      host,
    });

    if (!thePage) {
      throw new Meteor.Error('Page not found');
    }

    try {
      await ComposablePages.removeAsync(composablePageId);
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },
});

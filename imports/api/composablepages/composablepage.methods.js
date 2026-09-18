import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import ComposablePages from './composablepage';
import { isAdmin } from '../users/user.roles';

Meteor.methods({
  async getComposablePageById(composablePageId) {

    try {
      return await ComposablePages.findOneAsync(
        {
          _id: composablePageId,
        },
        {
          fields: {
            _id: 1,
            authorUsername: 1,
            authorName: 1,
            contentRows: 1,
            description: 1,
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

  async getComposablePages() {

    try {
      return await ComposablePages.find({
      }).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async getComposablePageTitles() {

    try {
      return await ComposablePages.find(
        {
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

    if (!user || !(await isAdmin(user._id))) {
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

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const composablePageId = formValues._id;
    const thePage = await ComposablePages.findOneAsync({
      _id: composablePageId,
    });

    if (!thePage) {
      throw new Meteor.Error('Page not found');
    }

    const {
      _id,
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

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      await ComposablePages.updateAsync(
        { _id: composablePageId },
        { $set: { isPublished: true } }
      );
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async unpublishComposablePage(composablePageId) {
    const user = await Meteor.userAsync();

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      await ComposablePages.updateAsync(
        { _id: composablePageId },
        { $set: { isPublished: false } }
      );
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async deleteComposablePage(composablePageId) {
    const user = await Meteor.userAsync();

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const thePage = await ComposablePages.findOneAsync({
      _id: composablePageId,
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

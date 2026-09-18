import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import Pages from './page';
import { isAdmin } from '../users/user.roles';

Meteor.methods({
  async getPages() {

    try {
      return await Pages.find(
        {
        },
        { sort: { order: 1 } }
      ).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't get pages");
    }
  },

  async getPageTitles() {

    try {
      return await Pages.find(
        {
        },
        {
          fields: {
            _id: 1,
            title: 1,
            order: 1,
          },
          sort: { order: 1 },
        }
      ).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't get pages");
    }
  },

  async createPage(formValues) {
    check(
      formValues,
      Match.ObjectIncluding({ title: String, longDescription: String })
    );
    const user = await Meteor.userAsync();

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const pageCount = await Pages.find({}).countAsync();

    try {
      await Pages.insertAsync({
        ...formValues,
        authorId: user._id,
        authorName: user.username,
        isPublished: true,
        order: pageCount + 1,
        creationDate: new Date(),
      });
      return formValues.title;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't add to Collection");
    }
  },

  async updatePage(pageId, formValues) {
    check(pageId, String);
    check(
      formValues,
      Match.ObjectIncluding({ title: String, longDescription: String })
    );
    const user = await Meteor.userAsync();

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const thePage = await Pages.findOneAsync({ _id: pageId });
    if (!thePage) {
      throw new Meteor.Error('not-found', 'Page not found');
    }
    if (thePage.isTermsPage) {
      throw new Meteor.Error('You cannot update terms page.');
    }

    const {
      _id,
      authorId,
      authorName,
      ...safeValues
    } = formValues;

    try {
      await Pages.updateAsync(pageId, {
        $set: {
          ...safeValues,
          latestUpdate: new Date(),
        },
      });
      return formValues.title;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't add to Collection");
    }
  },

  async savePageOrder(pages) {
    const user = await Meteor.userAsync();

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    if (!pages || !pages.length) {
      throw new Meteor.Error('No pages to update');
    }

    try {
      await Promise.all(
        pages.map(async (page) => {
          await Pages.updateAsync(
            { _id: page._id },
            {
              $set: {
                order: page.order,
              },
            }
          );
        })
      );
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't update collection");
    }
  },

  async deletePage(pageId) {
    const user = await Meteor.userAsync();

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const thePage = await Pages.findOneAsync({ _id: pageId });
    if (!thePage) {
      throw new Meteor.Error('not-found', 'Page not found');
    }
    if (thePage.isTermsPage) {
      throw new Meteor.Error('You cannot delete terms page');
    }

    try {
      await Pages.removeAsync(pageId);
      const remaining = await Pages.find(
        {},
        { sort: { order: 1 } }
      ).fetchAsync();
      await Promise.all(
        remaining.map((page, index) =>
          Pages.updateAsync({ _id: page._id }, { $set: { order: index + 1 } })
        )
      );
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't remove from collection");
    }
  },
});

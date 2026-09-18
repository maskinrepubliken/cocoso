import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import Categories from './category';
import { isAdmin, isContributorOrAdmin } from '../users/user.roles';

Meteor.methods({
  async getCategories() {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('You are not allowed');
    }

    return Categories.find(
      {
      },
      {
        fields: {
          _id: 1,
          label: 1,
          color: 1,
        },
      }
    ).fetchAsync();
  },

  async addNewCategory(category, type) {
    const user = await Meteor.userAsync();

    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const existingCat = await Categories.findOneAsync({
      label: category.toLowerCase(),
    });

    if (existingCat) {
      throw new Meteor.Error({ reason: 'Category already exists!' });
    }

    try {
      return await Categories.insertAsync({
        type,
        label: category.toLowerCase(),
        addedBy: user._id,
        addedUsername: user.username,
        addedDate: new Date(),
      });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async removeCategory(categoryId) {
    check(categoryId, String);
    const user = await Meteor.userAsync();

    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('You are not allowed');
    }

    try {
      await Categories.removeAsync({ _id: categoryId });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },
});

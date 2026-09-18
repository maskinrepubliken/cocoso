import { Meteor } from 'meteor/meteor';
import Keywords from './keyword';
import { getSite } from '../site/site';

Meteor.methods({
  async getKeywords() {
    return await Keywords.find({}, { sort: { label: 1 } }).fetchAsync();
  },

  async saveKeywords(keywords) {
    const user = await Meteor.userAsync();
    if (!user) {
      return;
    }
    try {
      await Meteor.users.updateAsync(user._id, {
        $set: {
          keywords: keywords.map((k) => ({
            keywordId: k._id,
            keywordLabel: k.label,
          })),
        },
      });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async createKeyword(keyword) {
    const user = await Meteor.userAsync();
    if (!user) {
      return;
    }

    if (await Keywords.findOneAsync({ label: keyword.toLowerCase() })) {
      throw new Meteor.Error('Keyword already exists');
    }

    const site = await getSite();

    try {
      const keywordId = await Keywords.insertAsync({
        creatorId: user._id,
        creatorUsername: user.username,
        creationDate: new Date(),
        label: keyword.toLowerCase(),
      });
      return keywordId;
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },
});

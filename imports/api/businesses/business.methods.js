import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { locationSelector } from '../_utils/shared';
import Businesses from './business';

Meteor.methods({
  async getBusinesses(locationId) {
    check(locationId, Match.Maybe(String));
    return await Businesses.find(locationSelector(locationId), {
      fields: Businesses.publicFields,
      sort: { label: 1 },
    }).fetchAsync();
  },

  async getBusinessById(businessId) {
    check(businessId, String);
    return await Businesses.findOneAsync(
      { _id: businessId },
      { fields: Businesses.publicFields }
    );
  },
});

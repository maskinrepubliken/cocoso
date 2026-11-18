import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import Site, { getSite } from './site';
import { isAdmin } from '../users/user.roles';
import Groups from '../groups/group';
import Works from '../works/work';
import Documents from '../documents/document';
import {
  DEFAULT_FEATURES,
  FEATURE_NAMES,
  applyFeatures,
  isFeature,
  isFeatureEnabled,
} from '../_utils/features';

// Switching whole sections of the site on and off (api/_utils/features.ts)
// from the admin view. The server keeps what is stored in force: read at
// start, and again whenever the site document's `features` change, by this
// method or by hand in the database.

const LOG_LENGTH = 50;

Meteor.startup(async () => {
  const site = await getSite({ features: 1 });
  applyFeatures(site?.features);
  await Site.find({}, { fields: { features: 1 } }).observeAsync({
    added: (doc) => applyFeatures(doc.features),
    changed: (doc) => applyFeatures(doc.features),
  });
});

async function requireAdmin() {
  const user = await Meteor.userAsync();
  if (!user || !(await isAdmin(user._id))) {
    throw new Meteor.Error('not-allowed', 'You are not allowed');
  }
  return user;
}

Meteor.methods({
  // For the admin view: each feature's state, whether that is the default
  // or an admin's choice, how much content it covers, and who changed it.
  async getFeaturesForAdmin() {
    await requireAdmin();
    const site = await getSite({ features: 1, featuresLog: 1 });
    const stored = site?.features || {};
    const log = site?.featuresLog || [];
    const [groups, works, documents] = await Promise.all([
      Groups.find({}).countAsync(),
      Works.find({}).countAsync(),
      Documents.find({
        contextType: { $in: ['resources', 'works'] },
      }).countAsync(),
    ]);
    const counts = { groups, works, documents };
    return FEATURE_NAMES.map((name) => ({
      name,
      enabled: isFeatureEnabled(name),
      isDefault: typeof stored[name] !== 'boolean',
      defaultEnabled: DEFAULT_FEATURES[name],
      count: counts[name],
      lastChange: [...log].reverse().find((entry) => entry.feature === name),
    }));
  },

  // `confirmation` must be the feature's own name: the view has the admin
  // type it, so a stray call cannot switch a section by accident.
  async setFeature(name, enabled, confirmation) {
    check(name, String);
    check(enabled, Boolean);
    check(confirmation, String);
    const user = await requireAdmin();
    if (!isFeature(name)) {
      throw new Meteor.Error('unknown-feature', `No feature called ${name}`);
    }
    if (confirmation !== name) {
      throw new Meteor.Error('not-confirmed', 'The change was not confirmed');
    }

    const site = await getSite({ _id: 1 });
    await Site.updateAsync(site._id, {
      $set: { [`features.${name}`]: enabled },
      $push: {
        featuresLog: {
          $each: [
            {
              feature: name,
              enabled,
              at: new Date(),
              byUserId: user._id,
              byUsername: user.username,
            },
          ],
          $slice: -LOG_LENGTH,
        },
      },
    });
    // The observer above does this too; doing it here means the answer to
    // this call already reflects the change.
    const updated = await getSite({ features: 1 });
    applyFeatures(updated?.features);
    return isFeatureEnabled(name);
  },
});

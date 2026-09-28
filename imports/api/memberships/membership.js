import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import 'meteor/aldeed:collection2/static';

const Memberships = new Mongo.Collection('memberships');

Memberships.schema = new SimpleSchema({
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  role: {
    type: String,
    allowedValues: ['participant', 'contributor', 'admin'],
  },
  isPublic: { type: Boolean, defaultValue: true },
  // Organizers are the people listed on /people, each with their events.
  isOrganizer: { type: Boolean, defaultValue: false },
  joinDate: { type: Date },
});

Memberships.attachSchema(Memberships.schema);

if (Meteor.isServer) {
  Meteor.startup(async () => {
    const raw = Memberships.rawCollection();
    // Indexes from the multi-tenant era; harmless if already gone.
    for (const name of ['userId_host_unique', 'host_role']) {
      try {
        await raw.dropIndex(name);
      } catch (_error) {
        // index did not exist
      }
    }
    await raw.createIndex(
      { userId: 1 },
      { unique: true, name: 'userId_unique' }
    );
    await raw.createIndex({ role: 1 }, { name: 'role' });
  });
}

export default Memberships;

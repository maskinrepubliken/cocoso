import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { Schemas } from '../_utils/schemas';

const Resources = new Mongo.Collection('resources');

Resources.schema = new SimpleSchema({
  _id: Schemas.Id,
  userId: Schemas.Id,

  // The place this resource is in; see imports/api/locations.
  locationId: { type: String, optional: true },

  label: { type: String },
  // The kinds of place, keys from imports/ui/pages/resources/resourceKinds.ts;
  // a place can be several (read with kindsOf in _utils/kinds.ts)
  kinds: { type: Array, optional: true },
  'kinds.$': { type: String },
  // Before kinds: the one kind, as category.key. Moved to kinds by
  // scripts/migrations/2026-10-kinds.mongosh.js
  category: { type: Object, optional: true },
  'category.key': { type: String },
  description: { type: String, optional: true },
  // Where the place is. Every place has one: a resource is a bookmark for
  // an address, and activities held here show it. The methods also insist
  // on a complete one (requireAddress in _utils/address.ts).
  address: { type: new SimpleSchema(Schemas.Address) },
  // Who to ask about the place, e.g. bookings. Optional.
  contact: { type: new SimpleSchema(Schemas.PublicContact), optional: true },
  documents: { type: Array, optional: true, defaultValue: [] },
  'documents.$': {
    type: new SimpleSchema({
      documentId: { type: String },
      downloadUrl: { type: String },
      label: { type: String },
    }),
    optional: true,
  },
  images: { type: Array, optional: true },
  'images.$': { type: String },
  imagesLegacy: { type: Array, optional: true },
  'imagesLegacy.$': { type: String, optional: true },

  isBookable: { type: Boolean, defaultValue: true },
  isCombo: { type: Boolean, defaultValue: false },

  resourcesForCombo: { type: Array, defaultValue: [] },
  'resourcesForCombo.$': {
    type: new SimpleSchema({
      _id: { type: String },
      label: { type: String },
      description: { type: String, optional: true },
    }),
    optional: true,
  },

  createdBy: { type: String, optional: true },
  createdAt: { type: Date, optional: true },
  updatedBy: { type: String, optional: true },
  updatedAt: { type: Date, optional: true },
});

Resources.attachSchema(Resources.schema);

Resources.publicFields = {
  _id: 1,
  address: 1,
  category: 1,
  kinds: 1,
  contact: 1,
  description: 1,
  images: 1,
  isBookable: 1,
  isCombo: 1,
  label: 1,
  locationId: 1,
  resourcesForCombo: 1,
  createdAt: 1,
  userId: 1,
};

export default Resources;

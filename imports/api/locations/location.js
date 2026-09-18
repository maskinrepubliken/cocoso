import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

import { Schemas } from '../_utils/schemas';

// A location is a place within the municipality: a village, a town or a
// district. Content (resources, activities, groups, works) may point at one
// location through `locationId`; content without one belongs to the whole
// municipality. Every location gets its own landing page at /<slug>.
const Locations = new Mongo.Collection('locations');

Locations.schema = new SimpleSchema({
  _id: Schemas.Id,
  slug: { type: String },
  name: { type: String },
  description: { type: String, optional: true },
  images: { type: Array, optional: true, defaultValue: [] },
  'images.$': { type: String },
  isPublished: { type: Boolean, defaultValue: false },
  order: { type: Number, defaultValue: 0 },
  // Optional composable page shown above the automatic sections of the
  // location's landing page.
  landingPageId: { type: String, optional: true },
  coordinates: { type: Object, optional: true },
  'coordinates.lat': { type: Number },
  'coordinates.lng': { type: Number },
  createdBy: { type: String, optional: true },
  createdAt: { type: Date },
  updatedAt: { type: Date, optional: true },
});

Locations.attachSchema(Locations.schema);

Locations.publicFields = {
  _id: 1,
  slug: 1,
  name: 1,
  description: 1,
  images: 1,
  isPublished: 1,
  order: 1,
  landingPageId: 1,
  coordinates: 1,
};

if (Meteor.isServer) {
  Meteor.startup(async () => {
    await Locations.rawCollection().createIndex(
      { slug: 1 },
      { unique: true, name: 'slug_unique' }
    );
  });
}

export default Locations;

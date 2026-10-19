import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { Schemas } from '../_utils/schemas';

// Places to eat, shop and stay: cafés, restaurants, shops and inns, each
// with opening hours and a menu (for a shop its range, for an inn its
// rooms). Shown under "Äta/handla/bo".
const Businesses = new Mongo.Collection('businesses');

// What a business is; one can be several, like a manor with a restaurant
// and rooms.
export const BUSINESS_KINDS = ['eat', 'shop', 'stay'];

Businesses.schema = new SimpleSchema({
  _id: Schemas.Id,

  // The place it is in; see imports/api/locations.
  locationId: { type: String, optional: true },
  isMunicipalityOnly: { type: Boolean, optional: true },

  label: { type: String },
  kinds: { type: Array, minCount: 1 },
  'kinds.$': { type: String, allowedValues: BUSINESS_KINDS },
  // One line under the name, e.g. "Pizzeria och grill".
  tagline: { type: String, optional: true },
  description: { type: String, optional: true },
  address: { type: new SimpleSchema(Schemas.Address), optional: true },
  contact: { type: new SimpleSchema(Schemas.PublicContact), optional: true },
  images: { type: Array, optional: true },
  'images.$': { type: String },

  // Weekly hours: one entry per opening, `day` 1 (Monday) to 7 (Sunday).
  // A day without an entry is closed.
  openingHours: { type: Array, optional: true, defaultValue: [] },
  'openingHours.$': new SimpleSchema({
    day: { type: SimpleSchema.Integer, min: 1, max: 7 },
    opens: { type: String, regEx: /^\d{2}:\d{2}$/ },
    closes: { type: String, regEx: /^\d{2}:\d{2}$/ },
  }),
  // Anything the weekly hours do not say, e.g. "Stängt vecka 29–31".
  hoursNote: { type: String, optional: true },

  // Sections of dishes, goods or rooms, each with a price.
  menu: { type: Array, optional: true, defaultValue: [] },
  'menu.$': new SimpleSchema({
    title: { type: String },
    items: { type: Array },
    'items.$': new SimpleSchema({
      name: { type: String },
      description: { type: String, optional: true },
      price: { type: String, optional: true },
    }),
  }),

  // Example data: the hours and menu are made up, and the page says so.
  isExample: { type: Boolean, optional: true },

  createdAt: { type: Date, optional: true },
  updatedAt: { type: Date, optional: true },
});

Businesses.attachSchema(Businesses.schema);

Businesses.publicFields = {
  _id: 1,
  address: 1,
  contact: 1,
  description: 1,
  hoursNote: 1,
  images: 1,
  isExample: 1,
  isMunicipalityOnly: 1,
  kinds: 1,
  label: 1,
  locationId: 1,
  menu: 1,
  openingHours: 1,
  tagline: 1,
};

export default Businesses;

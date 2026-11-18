import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { Schemas } from '../_utils/schemas';
import { OFFERING_KINDS } from './offeringKinds';

// What a place offers commercially: food and coffee, rooms, services or
// things for sale, one of each at most. A place with an offering is shown
// under Äta, handla & bo instead of Platser, and is a place in every other
// way (its page, its managers, events held there). Edited from the gear on
// the place's page, by those who may change the place.
const Offerings = new Mongo.Collection('offerings');

Offerings.schema = new SimpleSchema({
  _id: Schemas.Id,
  // The place it is at
  resourceId: { type: String },
  kind: { type: String, allowedValues: [...OFFERING_KINDS] },

  // What is offered, as rich text
  description: { type: String, optional: true },
  // Website, email, phone and a name for this offering, e.g. the hotel's
  // reception rather than the place as a whole
  contact: { type: new SimpleSchema(Schemas.PublicContact), optional: true },

  // Weekly hours, optional: one entry per opening, `day` 1 (Monday) to
  // 7 (Sunday). A day without an entry is closed.
  openingHours: { type: Array, optional: true, defaultValue: [] },
  'openingHours.$': new SimpleSchema({
    day: { type: SimpleSchema.Integer, min: 1, max: 7 },
    opens: { type: String, regEx: /^\d{2}:\d{2}$/ },
    closes: { type: String, regEx: /^\d{2}:\d{2}$/ },
  }),
  // Anything the weekly hours do not say, e.g. "Stängt vecka 29–31"
  hoursNote: { type: String, optional: true },

  // Moved over from the old Äta/handla/bo collection with made-up hours
  // and menu; the page says so. Gone once someone edits the offering.
  isExample: { type: Boolean, optional: true },
  // The old Äta/handla/bo item it came from, so old links still lead here
  legacyBusinessId: { type: String, optional: true },

  createdBy: { type: String, optional: true },
  createdAt: { type: Date, optional: true },
  updatedBy: { type: String, optional: true },
  updatedAt: { type: Date, optional: true },
});

Offerings.attachSchema(Offerings.schema);

Offerings.publicFields = {
  _id: 1,
  resourceId: 1,
  kind: 1,
  description: 1,
  contact: 1,
  openingHours: 1,
  hoursNote: 1,
  isExample: 1,
};

export default Offerings;

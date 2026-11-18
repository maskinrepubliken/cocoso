import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { Schemas } from '../_utils/schemas';
import { OFFERING_KINDS } from './offeringKinds';

// What a commercial place (resource.isCommercial) offers: food and coffee,
// rooms, services or things for sale, as many of each as it likes, e.g. a
// café and a restaurant. The place is shown under Äta, handla & bo instead
// of Platser, and is a place in every other way (its page, its managers,
// events held there). Edited from the gear on the place's page, by those
// who may change the place.
const Offerings = new Mongo.Collection('offerings');

Offerings.schema = new SimpleSchema({
  _id: Schemas.Id,
  // The place it is at
  resourceId: { type: String },
  kind: { type: String, allowedValues: [...OFFERING_KINDS] },
  // Its name, e.g. "Kafé" or "Gårdsbutiken"; without one, the kind's name
  title: { type: String, optional: true },
  // Its place in the place's list, from 0
  order: { type: SimpleSchema.Integer, optional: true },

  // What is offered, as rich text
  description: { type: String, optional: true },
  // How it is reached, if not as the place is (resource.commerce): a
  // manager, details of its own, a website or a free note, one of them
  contactUserId: { type: String, optional: true },
  contact: { type: new SimpleSchema(Schemas.PublicContact), optional: true },
  website: { type: String, optional: true },
  contactNote: { type: String, optional: true },

  // Its own weekly hours: one entry per opening, `day` 1 (Monday) to
  // 7 (Sunday). A day without an entry is closed. Absent: the place's
  // (resource.commerce.openingHours); empty: no hours (e.g. rooms).
  openingHours: { type: Array, optional: true },
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
  title: 1,
  order: 1,
  description: 1,
  contactUserId: 1,
  contact: 1,
  website: 1,
  contactNote: 1,
  openingHours: 1,
  hoursNote: 1,
  isExample: 1,
};

export default Offerings;

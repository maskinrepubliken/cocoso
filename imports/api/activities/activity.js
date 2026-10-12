import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { Schemas } from '../_utils/schemas';

const Activities = new Mongo.Collection('activities');

Activities.schema = new SimpleSchema({
  _id: Schemas.Id,

  authorId: Schemas.Id,
  authorName: { type: String },

  title: { type: String },
  subTitle: {
    type: String,
    optional: true,
  },
  longDescription: { type: String, optional: true },
  images: { type: Array, optional: true },
  'images.$': { type: String },
  imagesLegacy: { type: Array, optional: true },
  'imagesLegacy.$': { type: String, optional: true },
  resource: { type: String, optional: true },
  resourceId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  // Copied from the resource when one is set, otherwise chosen by the
  // author. Empty means the whole municipality.
  locationId: { type: String, optional: true },
  // The kind of event, one of the keys in imports/ui/pages/activities/eventKinds.ts
  category: { type: Object, optional: true },
  'category.key': { type: String },
  // Shown only when no place is selected (the municipality pages).
  isMunicipalityOnly: { type: Boolean, optional: true },

  // Co-organizers next to the author: they can edit the event and see
  // the sign-ups, and their public contact details are shown on the page.
  organizers: { type: Array, optional: true },
  'organizers.$': new SimpleSchema({
    userId: Schemas.Id,
    username: { type: String },
  }),
  // Contact details for this event in particular, next to the organizers'.
  contact: { type: new SimpleSchema(Schemas.PublicContact), optional: true },

  address: { type: String, optional: true },
  capacity: { type: SimpleSchema.Integer, defaultValue: 40 },
  place: { type: String, optional: true },

  datesAndTimes: { type: Array },
  'datesAndTimes.$': new SimpleSchema({
    startDate: { type: String },
    startTime: { type: String },
    endDate: { type: String },
    endTime: { type: String },
    attendees: { type: Array, defaultValue: [] },
    'attendees.$': {
      type: new SimpleSchema({
        email: Schemas.Email,
        username: { type: String, optional: true },
        firstName: { type: String, optional: true },
        lastName: { type: String, optional: true },
        numberOfPeople: { type: SimpleSchema.Integer, optional: true },
        // Hides the name from everyone but the organizer and admins.
        isNameHidden: { type: Boolean, optional: true },
        registerDate: { type: Date },
      }),
      optional: true,
    },
  }),

  // practicalInfo: { type: String, optional: true }, // null
  // internalInfo: { type: String, optional: true }, // null

  isExclusiveActivity: { type: Boolean, optional: true },
  isSentForReview: { type: Boolean },
  isPublicActivity: { type: Boolean, optional: true },
  isRegistrationDisabled: { type: Boolean, optional: true },
  isRegistrationEnabled: { type: Boolean, optional: true, defaultValue: true },
  isPublished: { type: Boolean },
  // Archived events leave every public listing and can only then be deleted.
  isArchived: { type: Boolean, optional: true },
  archivedAt: { type: Date, optional: true },

  groupId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  isGroupMeeting: { type: Boolean, optional: true },
  isGroupPrivate: { type: Boolean, optional: true },

  latestUpdate: { type: Date, optional: true },
  creationDate: { type: Date },
});

Activities.attachSchema(Activities.schema);

export default Activities;

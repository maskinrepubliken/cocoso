import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { locationSelector } from '../_utils/shared';
import { cleanContact, ContactPattern } from '../_utils/contact';
import methodError from '../_utils/methodError';
import Resources from '../resources/resource';
import canManagePlace from '../resources/resource.access';
import Offerings from './offering';
import { OFFERING_KINDS, isOfferingKind } from './offeringKinds';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const OpeningPattern = {
  day: Match.Integer,
  opens: String,
  closes: String,
};

const OfferingPattern = {
  kind: String,
  description: Match.Maybe(String),
  contact: ContactPattern,
  openingHours: Match.Maybe([OpeningPattern]),
  hoursNote: Match.Maybe(String),
};

// Only whole, sensible openings: a weekday, and a time that closes after
// it opens.
const cleanHours = (hours) =>
  (hours || []).filter(
    (o) =>
      o.day >= 1 &&
      o.day <= 7 &&
      TIME.test(o.opens) &&
      TIME.test(o.closes) &&
      o.opens < o.closes
  );

// An empty editor counts as nothing written
const cleanText = (html) => {
  const text = (html || '').trim();
  return text && text !== '<p><br></p>' ? text : null;
};

// In the order of the tabs
const byKind = (a, b) =>
  OFFERING_KINDS.indexOf(a.kind) - OFFERING_KINDS.indexOf(b.kind);

// The places that offer something, each with its offerings: the Äta,
// handla & bo page.
async function commercialPlaces(selector = {}) {
  const offerings = await Offerings.find(
    {},
    { fields: Offerings.publicFields }
  ).fetchAsync();
  const byPlace = new Map();
  offerings.forEach((offering) => {
    byPlace.set(offering.resourceId, [
      ...(byPlace.get(offering.resourceId) || []),
      offering,
    ]);
  });
  const places = await Resources.find(
    { ...selector, _id: { $in: [...byPlace.keys()] } },
    {
      fields: {
        _id: 1,
        label: 1,
        description: 1,
        images: 1,
        address: 1,
        contact: 1,
        locationId: 1,
        parentId: 1,
      },
      sort: { label: 1 },
    }
  ).fetchAsync();
  return places.map((place) => ({
    ...place,
    offerings: byPlace.get(place._id).sort(byKind),
  }));
}

Meteor.methods({
  // What a place offers, in the order of the tabs
  async getPlaceOfferings(resourceId) {
    check(resourceId, String);
    const offerings = await Offerings.find(
      { resourceId },
      { fields: Offerings.publicFields }
    ).fetchAsync();
    return offerings.sort(byKind);
  },

  async getCommercialPlaces(locationId) {
    check(locationId, Match.Maybe(String));
    return await commercialPlaces(locationSelector(locationId));
  },

  // The old Äta/handla/bo link of an item, to the place it became
  async getPlaceOfLegacyBusiness(businessId) {
    check(businessId, String);
    const offering = await Offerings.findOneAsync(
      { legacyBusinessId: businessId },
      { fields: { resourceId: 1 } }
    );
    return offering?.resourceId || null;
  },

  // Everything a place offers, as the editor's four tabs send it: one
  // offering per kind at most. A kind left out is taken away. Those who
  // may change the place may do this.
  async savePlaceOfferings(resourceId, offerings) {
    check(resourceId, String);
    check(offerings, [OfferingPattern]);
    const user = await Meteor.userAsync();
    const resource = await Resources.findOneAsync(
      { _id: resourceId },
      { fields: { managerIds: 1, parentId: 1 } }
    );
    if (!resource) {
      throw new Meteor.Error('not-found', 'Place not found');
    }
    if (!user || !(await canManagePlace(user._id, resource))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    const kinds = offerings.map((offering) => offering.kind);
    if (
      kinds.some((kind) => !isOfferingKind(kind)) ||
      new Set(kinds).size !== kinds.length
    ) {
      throw new Meteor.Error('invalid-kind', 'One offering per kind');
    }

    try {
      const now = new Date();
      for (const offering of offerings) {
        const description = cleanText(offering.description);
        const contact = cleanContact(offering.contact);
        const openingHours = cleanHours(offering.openingHours);
        const hoursNote = (offering.hoursNote || '').trim();
        const existing = await Offerings.findOneAsync(
          { resourceId, kind: offering.kind },
          { fields: { _id: 1 } }
        );
        const set = {
          openingHours,
          ...(description ? { description } : {}),
          ...(contact ? { contact } : {}),
          ...(hoursNote ? { hoursNote } : {}),
          updatedBy: user.username,
          updatedAt: now,
        };
        // An edited offering is no longer made-up example data
        const unset = {
          isExample: 1,
          ...(description ? {} : { description: 1 }),
          ...(contact ? {} : { contact: 1 }),
          ...(hoursNote ? {} : { hoursNote: 1 }),
        };
        if (existing) {
          await Offerings.updateAsync(
            { _id: existing._id },
            { $set: set, $unset: unset }
          );
        } else {
          await Offerings.insertAsync({
            resourceId,
            kind: offering.kind,
            ...set,
            createdBy: user.username,
            createdAt: now,
          });
        }
      }
      await Offerings.removeAsync({ resourceId, kind: { $nin: kinds } });
    } catch (error) {
      throw methodError(error, "Couldn't save the offerings");
    }
  },
});

export { commercialPlaces };

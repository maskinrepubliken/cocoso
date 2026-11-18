import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { locationSelector } from '../_utils/shared';
import { cleanContact, ContactPattern } from '../_utils/contact';
import methodError from '../_utils/methodError';
import Resources from '../resources/resource';
import canManagePlace from '../resources/resource.access';
import Offerings from './offering';
import { isOfferingKind } from './offeringKinds';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const OpeningPattern = {
  day: Match.Integer,
  opens: String,
  closes: String,
};

const CommercePattern = {
  isCommercial: Boolean,
  tagline: Match.Maybe(String),
  contact: ContactPattern,
  openingHours: Match.Maybe([OpeningPattern]),
  hoursNote: Match.Maybe(String),
};

const OfferingPattern = {
  _id: Match.Maybe(String),
  kind: String,
  title: Match.Maybe(String),
  description: Match.Maybe(String),
  contact: ContactPattern,
  // null: the place's hours. (OneOf: Maybe alone lets no null through
  // around an array.)
  openingHours: Match.Maybe(Match.OneOf(null, [OpeningPattern])),
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

// The commercial places, each with its offerings: the Äta, handla & bo
// page.
async function commercialPlaces(selector = {}) {
  const places = await Resources.find(
    { ...selector, isCommercial: true },
    {
      fields: {
        _id: 1,
        label: 1,
        description: 1,
        images: 1,
        address: 1,
        contact: 1,
        commerce: 1,
        locationId: 1,
        parentId: 1,
      },
      sort: { label: 1 },
    }
  ).fetchAsync();
  const offerings = await Offerings.find(
    { resourceId: { $in: places.map((place) => place._id) } },
    { fields: Offerings.publicFields, sort: { order: 1 } }
  ).fetchAsync();
  return places.map((place) => ({
    ...place,
    offerings: offerings.filter((o) => o.resourceId === place._id),
  }));
}

Meteor.methods({
  // What a place offers, in its order
  async getPlaceOfferings(resourceId) {
    check(resourceId, String);
    return await Offerings.find(
      { resourceId },
      { fields: Offerings.publicFields, sort: { order: 1 } }
    ).fetchAsync();
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

  // A place's Äta, handla & bo, as the editor sends it: whether it is a
  // commercial place, its tagline and the defaults its offerings use, and
  // its offerings in order. An offering left out is taken away; a place
  // that is no longer commercial loses them all. Those who may change the
  // place may do this.
  async savePlaceCommerce(resourceId, commerce, offerings) {
    check(resourceId, String);
    check(commerce, CommercePattern);
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
    if (offerings.some((offering) => !isOfferingKind(offering.kind))) {
      throw new Meteor.Error('invalid-kind', 'Unknown kind of offering');
    }

    try {
      const now = new Date();
      if (!commerce.isCommercial) {
        await Resources.updateAsync(
          { _id: resourceId },
          {
            $unset: { isCommercial: 1, commerce: 1 },
            $set: { updatedBy: user.username, updatedAt: now },
          }
        );
        await Offerings.removeAsync({ resourceId });
        return;
      }

      const tagline = (commerce.tagline || '').trim();
      const contact = cleanContact(commerce.contact);
      const openingHours = cleanHours(commerce.openingHours);
      const hoursNote = (commerce.hoursNote || '').trim();
      await Resources.updateAsync(
        { _id: resourceId },
        {
          $set: {
            isCommercial: true,
            commerce: {
              ...(tagline ? { tagline } : {}),
              ...(contact ? { contact } : {}),
              ...(openingHours.length ? { openingHours } : {}),
              ...(hoursNote ? { hoursNote } : {}),
            },
            updatedBy: user.username,
            updatedAt: now,
          },
        }
      );

      const kept = [];
      for (const [order, offering] of offerings.entries()) {
        const title = (offering.title || '').trim();
        const description = cleanText(offering.description);
        const ownContact = cleanContact(offering.contact);
        // null: the place's hours; an array (even empty): its own
        const ownHours = Array.isArray(offering.openingHours)
          ? cleanHours(offering.openingHours)
          : null;
        const ownNote = ownHours ? (offering.hoursNote || '').trim() : '';
        const existing =
          offering._id &&
          (await Offerings.findOneAsync(
            { _id: offering._id, resourceId },
            { fields: { _id: 1 } }
          ));
        const set = {
          kind: offering.kind,
          order,
          ...(title ? { title } : {}),
          ...(description ? { description } : {}),
          ...(ownContact ? { contact: ownContact } : {}),
          ...(ownHours ? { openingHours: ownHours } : {}),
          ...(ownNote ? { hoursNote: ownNote } : {}),
          updatedBy: user.username,
          updatedAt: now,
        };
        // An edited offering is no longer made-up example data
        const unset = {
          isExample: 1,
          ...(title ? {} : { title: 1 }),
          ...(description ? {} : { description: 1 }),
          ...(ownContact ? {} : { contact: 1 }),
          ...(ownHours ? {} : { openingHours: 1 }),
          ...(ownNote ? {} : { hoursNote: 1 }),
        };
        if (existing) {
          await Offerings.updateAsync(
            { _id: existing._id },
            { $set: set, $unset: unset }
          );
          kept.push(existing._id);
        } else {
          kept.push(
            await Offerings.insertAsync({
              resourceId,
              ...set,
              createdBy: user.username,
              createdAt: now,
            })
          );
        }
      }
      await Offerings.removeAsync({ resourceId, _id: { $nin: kept } });
    } catch (error) {
      throw methodError(error, "Couldn't save Äta, handla & bo");
    }
  },
});

export { commercialPlaces };

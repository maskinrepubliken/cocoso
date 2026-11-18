import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { locationSelector } from '../_utils/shared';
import { cleanContact, ContactPattern } from '../_utils/contact';
import methodError from '../_utils/methodError';
import Resources from '../resources/resource';
import canManagePlace from '../resources/resource.access';
import {
  attachPlaceContact,
  cleanPlaceContact,
} from '../resources/resource.contact';
import Offerings from './offering';
import { isOfferingKind } from './offeringKinds';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const OpeningPattern = {
  day: Match.Integer,
  opens: String,
  closes: String,
};

// Absent, null or the pattern. (Match.Maybe alone lets no null through
// here.)
const nullable = (pattern) => Match.Maybe(Match.OneOf(null, pattern));

// How it is reached: one of them filled in, or none
const ReachPattern = {
  contactUserId: nullable(String),
  contact: ContactPattern,
  website: nullable(String),
  contactNote: nullable(String),
};

const CommercePattern = {
  isCommercial: Boolean,
  tagline: nullable(String),
  ...ReachPattern,
  openingHours: nullable([OpeningPattern]),
  hoursNote: nullable(String),
};

const OfferingPattern = {
  _id: nullable(String),
  kind: String,
  title: nullable(String),
  description: nullable(String),
  // None of them: reached as the place is
  ...ReachPattern,
  // null: the place's hours
  openingHours: nullable([OpeningPattern]),
  hoursNote: nullable(String),
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

// A website as an address, https:// added when left out; null when empty
const cleanWebsite = (website) =>
  website ? cleanContact({ website })?.website || null : null;

// How it is reached, as chosen: a manager of the place who can be
// reached, its website, a free note, or details of its own (name, email
// and phone). An empty object for none.
async function cleanReach(values, managerIds) {
  if (values.contactUserId) {
    return cleanPlaceContact(
      { contactUserId: values.contactUserId },
      managerIds
    );
  }
  const website = cleanWebsite(values.website);
  if (website) {
    return { website };
  }
  const contactNote = (values.contactNote || '').trim();
  if (contactNote) {
    return { contactNote };
  }
  const contact = values.contact
    ? cleanContact({ ...values.contact, website: '' })
    : null;
  return contact ? { contact } : {};
}

const REACH = ['contactUserId', 'contact', 'website', 'contactNote'];

// The fields of REACH not chosen, to $unset
const unsetOthers = (reach) =>
  Object.fromEntries(
    REACH.filter((key) => !(key in reach)).map((key) => [key, 1])
  );

// A chosen manager's details in `contact`, as on the place's own page
const withReach = (item) =>
  item?.contactUserId ? attachPlaceContact(item) : item;

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
  return Promise.all(
    places.map(async (place) => ({
      ...place,
      commerce: await withReach(place.commerce),
      offerings: await Promise.all(
        offerings.filter((o) => o.resourceId === place._id).map(withReach)
      ),
    }))
  );
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
      const reach = await cleanReach(commerce, resource.managerIds);
      const openingHours = cleanHours(commerce.openingHours);
      const hoursNote = (commerce.hoursNote || '').trim();
      await Resources.updateAsync(
        { _id: resourceId },
        {
          $set: {
            isCommercial: true,
            commerce: {
              ...(tagline ? { tagline } : {}),
              ...reach,
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
        const ownReach = await cleanReach(offering, resource.managerIds);
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
          ...ownReach,
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
          ...unsetOthers(ownReach),
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

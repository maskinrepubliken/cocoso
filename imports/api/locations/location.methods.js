import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import Locations from './location';
import Resources from '../resources/resource';
import Activities from '../activities/activity';
import Groups from '../groups/group';
import Works from '../works/work';
import { isAdmin } from '../users/user.roles';
import { isReservedSlug, slugify } from './reservedSlugs';
import { warmShareImage } from '../share/shareImage.server';

const sort = { order: 1, name: 1 };

// How far away the nearest location may be to be suggested for a point
const NEAR_KM = 15;

const plain = (text) => (text || '').trim().toLowerCase();

const kmBetween = (a, b) => {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  return 6371 * Math.sqrt(dLat * dLat + dLng * dLng);
};

async function requireAdmin() {
  const user = await Meteor.userAsync();
  if (!user || !(await isAdmin(user._id))) {
    throw new Meteor.Error('not-allowed', 'You are not allowed');
  }
  return user;
}

async function resolveSlug(values, currentId) {
  const slug = slugify(values.slug || values.name);
  if (isReservedSlug(slug)) {
    throw new Meteor.Error(
      'slug-reserved',
      'This address is reserved, please choose another'
    );
  }
  const clash = await Locations.findOneAsync({
    slug,
    ...(currentId ? { _id: { $ne: currentId } } : {}),
  });
  if (clash) {
    throw new Meteor.Error(
      'slug-taken',
      'Another location already uses this address'
    );
  }
  return slug;
}

function pickValues(values) {
  return {
    name: String(values.name || '').trim(),
    description: values.description || '',
    images: Array.isArray(values.images) ? values.images : [],
    isPublished: Boolean(values.isPublished),
    landingPageId: values.landingPageId || undefined,
    colorKey: ['skog', 'lera', 'glas', 'ockra', 'salvia'].includes(
      values.colorKey
    )
      ? values.colorKey
      : undefined,
    coordinates:
      values.coordinates &&
      Number.isFinite(values.coordinates.lat) &&
      Number.isFinite(values.coordinates.lng)
        ? { lat: values.coordinates.lat, lng: values.coordinates.lng }
        : undefined,
  };
}

Meteor.methods({
  // Published locations, for visitors. Loaded once at boot into
  // locationsAtom and used for the location picker, routes and filters.
  async getLocations() {
    return await Locations.find(
      { isPublished: true },
      { fields: Locations.publicFields, sort }
    ).fetchAsync();
  },

  // Every location, published or not, so contributors can file content
  // under a place before it goes public.
  async getLocationsForContent() {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('not-allowed', 'You are not allowed');
    }
    return await Locations.find(
      {},
      { fields: { _id: 1, name: 1, slug: 1, isPublished: 1 }, sort }
    ).fetchAsync();
  },

  // The location a place at this address is in, for the place form to
  // choose by itself: one named as its town ("Tranemo" is Tranemo tätort),
  // or else the nearest to its point, where a location is the middle of
  // the places already in it, at most NEAR_KM away. Null when none.
  async suggestLocationFor(where) {
    // (Match.Maybe alone lets no null through here)
    check(where, {
      city: Match.Maybe(Match.OneOf(null, String)),
      coordinates: Match.Maybe(Match.OneOf(null, { lat: Number, lng: Number })),
    });
    const locations = await Locations.find(
      { isPublished: true },
      { fields: { name: 1 } }
    ).fetchAsync();
    const city = plain(where.city);
    if (city) {
      const named = locations.find(
        (location) =>
          plain(location.name) === city ||
          plain(location.name).split(/\s+/)[0] === city
      );
      if (named) {
        return named._id;
      }
    }
    const point = where.coordinates;
    if (!point) {
      return null;
    }
    const places = await Resources.find(
      {
        locationId: { $in: locations.map((location) => location._id) },
        'address.coordinates': { $exists: true },
      },
      { fields: { locationId: 1, 'address.coordinates': 1 } }
    ).fetchAsync();
    let nearest = null;
    locations.forEach((location) => {
      const own = places.filter((place) => place.locationId === location._id);
      if (!own.length) {
        return;
      }
      const middle = {
        lat:
          own.reduce((sum, place) => sum + place.address.coordinates.lat, 0) /
          own.length,
        lng:
          own.reduce((sum, place) => sum + place.address.coordinates.lng, 0) /
          own.length,
      };
      const km = kmBetween(point, middle);
      if (km <= NEAR_KM && (!nearest || km < nearest.km)) {
        nearest = { id: location._id, km };
      }
    });
    return nearest?.id || null;
  },

  async getLocationsForAdmin() {
    await requireAdmin();
    return await Locations.find({}, { sort }).fetchAsync();
  },

  async getLocationBySlug(slug) {
    check(slug, String);
    return await Locations.findOneAsync(
      { slug, isPublished: true },
      { fields: Locations.publicFields }
    );
  },

  async createLocation(values) {
    check(values, Match.ObjectIncluding({ name: String }));
    const user = await requireAdmin();
    if (values.name.trim().length < 2) {
      throw new Meteor.Error('name-too-short', 'The name is too short');
    }

    const slug = await resolveSlug(values);
    const count = await Locations.find().countAsync();

    return await Locations.insertAsync({
      ...pickValues(values),
      slug,
      order: count,
      createdBy: user._id,
      createdAt: new Date(),
    });
  },

  async updateLocation(locationId, values) {
    check(locationId, String);
    check(values, Match.ObjectIncluding({ name: String }));
    await requireAdmin();

    const location = await Locations.findOneAsync(locationId);
    if (!location) {
      throw new Meteor.Error('not-found', 'Location not found');
    }

    const slug = await resolveSlug(values, locationId);

    await Locations.updateAsync(locationId, {
      $set: {
        ...pickValues(values),
        slug,
        updatedAt: new Date(),
      },
    });
    warmShareImage('location', locationId);
  },

  async setLocationPublished(locationId, isPublished) {
    check(locationId, String);
    check(isPublished, Boolean);
    await requireAdmin();
    await Locations.updateAsync(locationId, {
      $set: { isPublished, updatedAt: new Date() },
    });
    if (isPublished) {
      warmShareImage('location', locationId);
    }
  },

  async reorderLocations(locationIds) {
    check(locationIds, [String]);
    await requireAdmin();
    await Promise.all(
      locationIds.map((_id, order) =>
        Locations.updateAsync(_id, { $set: { order } })
      )
    );
  },

  // Refuses while content still points at the location, so nothing silently
  // loses its place. Reassign or clear that content first.
  async removeLocation(locationId) {
    check(locationId, String);
    await requireAdmin();

    const selector = { locationId };
    const counts = await Promise.all([
      Resources.find(selector).countAsync(),
      Activities.find(selector).countAsync(),
      Groups.find(selector).countAsync(),
      Works.find(selector).countAsync(),
    ]);
    const inUse = counts.reduce((sum, n) => sum + n, 0);
    if (inUse > 0) {
      throw new Meteor.Error(
        'location-in-use',
        `${inUse} item(s) still belong to this location`
      );
    }

    await Locations.removeAsync(locationId);
  },
});

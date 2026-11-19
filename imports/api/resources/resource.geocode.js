import { Meteor } from 'meteor/meteor';

import Resources from './resource';
import { geocodeAddress, geocodePlace } from '../_utils/geocode';

// Places without coordinates get no map. A place saved in the form gets
// them from its street (resource.methods.js), but not one added by hand in
// the database or with only a town in its address. Once the server has
// started, each such place is looked up, one a second as Nominatim asks:
// by its street, or else (or failing that) by its name in the
// municipality. What cannot be
// found stays without a map, and is tried again at the next start.

async function fillMissingCoordinates() {
  const places = await Resources.find(
    {
      'address.coordinates': { $exists: false },
      parentId: { $exists: false },
    },
    { fields: { label: 1, address: 1 } }
  ).fetchAsync();
  let found = 0;
  for (const place of places) {
    const coordinates =
      (place.address?.street && (await geocodeAddress(place.address))) ||
      (await geocodePlace(place.label, place.address?.city));
    if (coordinates) {
      // Only if still without: someone may have saved it meanwhile
      await Resources.updateAsync(
        { _id: place._id, 'address.coordinates': { $exists: false } },
        { $set: { 'address.coordinates': coordinates } }
      );
      // Its parts are where it is
      await Resources.updateAsync(
        { parentId: place._id },
        { $set: { 'address.coordinates': coordinates } },
        { multi: true }
      );
      found += 1;
    }
  }
  if (places.length) {
    console.info(
      `[geocode] coordinates found for ${found} of ${places.length} places`
    );
  }
}

Meteor.startup(() => {
  // In the background, not holding up the start
  Meteor.setTimeout(() => {
    fillMissingCoordinates().catch((error) =>
      console.warn('[geocode]', error.message)
    );
  }, 10000);
});

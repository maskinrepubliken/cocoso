// Server only. Finds the point on the map for a written address with
// Nominatim (OpenStreetMap's geocoder), so a place saved with a street but
// no coordinates still gets a map.
//
// Nominatim's usage policy: at most one request a second, an identifying
// User-Agent, no bulk use. Places are saved one at a time by admins, which
// stays far inside that. Failures are quiet: the address is kept without
// coordinates and can be given them by hand.

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = `cocoso (${process.env.ROOT_URL || 'cocoso'})`;
const TIMEOUT_MS = 4000;

export async function geocodeAddress(address) {
  if (!address?.street || !address?.city) {
    return null;
  }
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'se',
    street: address.street,
    city: address.city,
    ...(address.postalCode
      ? { postalcode: address.postalCode.replace(/\s/g, '') }
      : {}),
  });
  try {
    const response = await fetch(`${ENDPOINT}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    const [hit] = await response.json();
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch (error) {
    console.warn('[geocode]', error.message);
    return null;
  }
}

// The address with coordinates added when it has none and they can be found.
export async function withCoordinates(address) {
  if (!address || address.coordinates) {
    return address;
  }
  const coordinates = await geocodeAddress(address);
  return coordinates ? { ...address, coordinates } : address;
}

// Tranemo kommun with a margin, west, north, east, south: a place found by
// its name must lie in it.
const MUNICIPALITY = '12.95,57.75,13.75,57.28';

// For a place with only a town in its address, or a street that cannot be
// found: its name looked up in the municipality ("Ingsvallen, Länghem"),
// for a bathing place or a walk the water's name alone ("Ösjön,
// Limmared"), and for a school's hall the school ("Länghemsskolan").
// Null when nothing is found, rather than the town's middle, which would
// put it in the wrong spot.
export async function geocodePlace(label, city) {
  if (!label || !city) {
    return null;
  }
  const plain = label
    .replace(/^Badplatsen\s+/i, '')
    .replace(/\s+runt$/i, '')
    .replace(/skolans\s+(idrottshall|gymnastiksal)$/i, 'skolan');
  // The name alone only when particular: made so (a school, a lake) or of
  // several words ("Torpa stenhus"), never a general one like
  // "Gymnastiksalen"
  const particular = [plain, label].filter(
    (name) => name !== label || /\s/.test(label)
  );
  const queries = [
    ...new Set([`${label}, ${city}`, `${plain}, ${city}`, ...particular]),
  ];
  for (const [index, q] of queries.entries()) {
    if (index > 0) {
      // Nominatim's usage policy: at most one request a second
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    const params = new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'se',
      q,
      viewbox: MUNICIPALITY,
      bounded: '1',
    });
    try {
      const response = await fetch(`${ENDPOINT}?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) {
        const [hit] = await response.json();
        const lat = Number(hit?.lat);
        const lng = Number(hit?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
    } catch (error) {
      console.warn('[geocode]', error.message);
    }
  }
  return null;
}

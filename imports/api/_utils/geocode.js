// Server only. Finds the point on the map for a written address with
// Nominatim (OpenStreetMap's geocoder), so a place saved with a street but
// no coordinates still gets a map.
//
// Nominatim's usage policy: at most one request a second, an identifying
// User-Agent, no bulk use. Places are saved one at a time by admins, which
// stays far inside that. Failures are quiet: the address is kept without
// coordinates and can be given them by hand.

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = `cocoso (${process.env.ROOT_URL || 'cocoso'})`;
const TIMEOUT_MS = 4000;
const SPACING_MS = 1100;

// Every request waits its turn, a little over a second after the one
// before, whoever asks: the form looking up an address as it is typed, a
// save, or the background lookup at start.
let queue = Promise.resolve();
const inTurn = (request) => {
  const turn = queue.then(request);
  queue = turn
    .catch(() => null)
    .then(() => new Promise((resolve) => setTimeout(resolve, SPACING_MS)));
  return turn;
};

// Answers already had, so the same address typed again is not asked twice
const answers = new Map();

// The first hit's point for these search parameters, with whether it is
// the house itself (`exact`) rather than only its street, or null. With
// `town`, only a hit in that town or village: asked for "Tranemo",
// Nominatim answers with the whole of Tranemo kommun first, and for
// "Storgatan, Tranemo" with the Storgatan of Grimsås and Rosenlund.
async function search(params, town = '') {
  const key = `${params}|${town}`;
  if (answers.has(key)) {
    return answers.get(key);
  }
  const point = await inTurn(async () => {
    try {
      const response = await fetch(`${ENDPOINT}?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      const hits = await response.json();
      const wanted = town.trim().toLowerCase();
      const inTown = (candidate) =>
        ['city', 'town', 'village', 'hamlet', 'suburb'].some(
          (level) => (candidate.address?.[level] || '').toLowerCase() === wanted
        );
      const hit = wanted ? hits.find(inTown) : hits[0];
      const lat = Number(hit?.lat);
      const lng = Number(hit?.lon);
      return Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng, exact: Boolean(hit.address?.house_number) }
        : null;
    } catch (error) {
      console.warn('[geocode]', error.message);
      return null;
    }
  });
  if (answers.size > 500) {
    answers.clear();
  }
  answers.set(key, point);
  return point;
}

// Only the point, for storing
const pointOf = (hit) => (hit ? { lat: hit.lat, lng: hit.lng } : null);

// Tranemo kommun with a margin, west, north, east, south: a place found by
// its name must lie in it.
const MUNICIPALITY = '12.95,57.75,13.75,57.28';

// The middle of a town or village in the municipality (not the
// municipality of the same name), to show the map around it
export async function geocodeTown(city) {
  if (!city) {
    return null;
  }
  return pointOf(
    await search(
      new URLSearchParams({
        format: 'jsonv2',
        limit: '5',
        addressdetails: '1',
        countrycodes: 'se',
        q: city,
        viewbox: MUNICIPALITY,
        bounded: '1',
      }),
      city
    )
  );
}

// A street address's point, with whether it is the house itself or only
// its street (OpenStreetMap lacks many house numbers in Tranemo kommun): a
// hit in its own town, or else the street looked for close around that
// town. Null rather than the same street in another town.
export async function geocodeAddressDetail(address) {
  if (!address?.street || !address?.city) {
    return null;
  }
  const found = await search(
    new URLSearchParams({
      format: 'jsonv2',
      limit: '5',
      addressdetails: '1',
      countrycodes: 'se',
      street: address.street,
      city: address.city,
      ...(address.postalCode
        ? { postalcode: address.postalCode.replace(/\s/g, '') }
        : {}),
    }),
    address.city
  );
  if (found) {
    return found;
  }
  const town = await geocodeTown(address.city);
  if (!town) {
    return null;
  }
  // A few kilometres around the town's middle
  const around = [
    town.lng - 0.06,
    town.lat + 0.035,
    town.lng + 0.06,
    town.lat - 0.035,
  ].join(',');
  const near = await search(
    new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      addressdetails: '1',
      countrycodes: 'se',
      q: address.street,
      viewbox: around,
      bounded: '1',
    })
  );
  return near;
}

// The point alone, for storing
export async function geocodeAddress(address) {
  return pointOf(await geocodeAddressDetail(address));
}

// The other way: the address at a point on the map, as street (with its
// number when there is one), postal code and town; null when there is
// none near. Asked as precisely as a house.
export async function geocodePoint({ lat, lng }) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '18',
    addressdetails: '1',
  });
  const key = `reverse|${params}`;
  if (answers.has(key)) {
    return answers.get(key);
  }
  const found = await inTurn(async () => {
    try {
      const response = await fetch(`${REVERSE_ENDPOINT}?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      const { address } = await response.json();
      const road =
        address?.road || address?.pedestrian || address?.footway || '';
      const city =
        address?.town ||
        address?.village ||
        address?.city ||
        address?.hamlet ||
        address?.suburb ||
        '';
      if (!road && !city) {
        return null;
      }
      return {
        street: [road, address?.house_number].filter(Boolean).join(' '),
        postalCode: address?.postcode || '',
        city,
      };
    } catch (error) {
      console.warn('[geocode]', error.message);
      return null;
    }
  });
  answers.set(key, found);
  return found;
}

// The address with coordinates added when it has none and they can be found.
export async function withCoordinates(address) {
  if (!address || address.coordinates) {
    return address;
  }
  const coordinates = await geocodeAddress(address);
  return coordinates ? { ...address, coordinates } : address;
}

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
  for (const q of queries) {
    const point = await search(
      new URLSearchParams({
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'se',
        q,
        viewbox: MUNICIPALITY,
        bounded: '1',
      })
    );
    if (point) {
      return pointOf(point);
    }
  }
  return null;
}

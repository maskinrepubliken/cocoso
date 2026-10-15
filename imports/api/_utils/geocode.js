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

import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

// A street address in Sweden, optionally pinned to a point on the map.
//
// Resources (places) always have one: a resource is a bookmark for an
// address. An activity is held at a resource, and only when it is not may it
// carry an address of its own (see resolveActivityAddress).
//
// A beach or a football pitch often has no street address, so an address
// is complete with a town (`city`) and either a street or coordinates.
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  // Street and number, or a description of where ("Norra stranden").
  street?: string;
  // Swedish postal code, stored as "514 33".
  postalCode?: string;
  // Postort: the town the address belongs to.
  city: string;
  coordinates?: Coordinates;
}

const CoordinatesPattern = Match.Maybe(
  Match.OneOf(null, { lat: Number, lng: Number })
);

export const AddressPattern = Match.Maybe(
  Match.OneOf(null, {
    street: Match.Maybe(String),
    postalCode: Match.Maybe(String),
    city: Match.Maybe(String),
    coordinates: CoordinatesPattern,
  })
);

const trimmed = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

// "51433" and "514 33" both become "514 33"; anything else is kept as typed.
export const formatPostalCode = (postalCode?: string): string => {
  const value = trimmed(postalCode);
  const digits = value.replace(/\s/g, '');
  return /^\d{5}$/.test(digits) ? `${digits.slice(0, 3)} ${digits.slice(3)}` : value;
};

const validCoordinates = (c?: Coordinates | null): c is Coordinates =>
  Boolean(
    c &&
      Number.isFinite(c.lat) &&
      Number.isFinite(c.lng) &&
      Math.abs(c.lat) <= 90 &&
      Math.abs(c.lng) <= 180
  );

// Reads "57.4857, 13.3510" (as copied from most map services) or
// "57,4857 13,3510"; null when it is not a pair of coordinates.
export const parseCoordinates = (text?: string): Coordinates | null => {
  const value = trimmed(text);
  if (!value) {
    return null;
  }
  const match = value.match(
    /^(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/
  );
  if (!match) {
    return null;
  }
  const coordinates = {
    lat: Number(match[1].replace(',', '.')),
    lng: Number(match[2].replace(',', '.')),
  };
  return validCoordinates(coordinates) ? coordinates : null;
};

export const formatCoordinates = (c?: Coordinates | null): string =>
  validCoordinates(c) ? `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : '';

// Enough to find the place: a town, and a street or a point on the map.
export const isCompleteAddress = (address?: Partial<Address> | null): boolean =>
  Boolean(
    address &&
      trimmed(address.city) &&
      (trimmed(address.street) || validCoordinates(address.coordinates))
  );

export const hasAddress = (address?: Partial<Address> | null): boolean =>
  Boolean(
    address &&
      (trimmed(address.street) ||
        trimmed(address.city) ||
        validCoordinates(address.coordinates))
  );

// An address with only the filled-in fields, or null when empty. Throws when
// something was filled in but it does not make a complete address.
export const cleanAddress = (
  address?: Partial<Address> | null
): Address | null => {
  if (!address) {
    return null;
  }
  check(address, AddressPattern);
  const street = trimmed(address.street);
  const postalCode = formatPostalCode(address.postalCode);
  const city = trimmed(address.city);
  const coordinates = validCoordinates(address.coordinates)
    ? { lat: address.coordinates.lat, lng: address.coordinates.lng }
    : null;
  if (!street && !postalCode && !city && !coordinates) {
    return null;
  }
  const cleaned: Address = {
    ...(street ? { street } : {}),
    ...(postalCode ? { postalCode } : {}),
    city,
    ...(coordinates ? { coordinates } : {}),
  };
  if (!isCompleteAddress(cleaned)) {
    throw new Meteor.Error(
      'incomplete-address',
      'An address needs a town and a street or coordinates'
    );
  }
  return cleaned;
};

// cleanAddress, then insist on there being one.
export const requireAddress = (address?: Partial<Address> | null): Address => {
  const cleaned = cleanAddress(address);
  if (!cleaned) {
    throw new Meteor.Error('address-required', 'An address is required');
  }
  return cleaned;
};

// The lines as written on an envelope: "Willéns väg 5", "514 33 Tranemo".
export const addressLines = (address?: Partial<Address> | null): string[] => {
  if (!address) {
    return [];
  }
  const town = [address.postalCode, address.city].filter(Boolean).join(' ');
  return [address.street, town].filter(Boolean) as string[];
};

// One line: "Willéns väg 5, 514 33 Tranemo".
export const formatAddress = (address?: Partial<Address> | null): string =>
  addressLines(address).join(', ');

// A link that shows the address on OpenStreetMap: the exact point when
// there is one, otherwise a search for the written address.
export const mapUrl = (address?: Partial<Address> | null): string | null => {
  if (!address) {
    return null;
  }
  if (validCoordinates(address.coordinates)) {
    const { lat, lng } = address.coordinates;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  }
  const text = formatAddress(address);
  return text
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(text)}`
    : null;
};

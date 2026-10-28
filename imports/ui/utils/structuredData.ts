import type { Address } from '/imports/api/_utils/address';

// schema.org descriptions of events and places as JSON-LD, for ShareMeta's
// `structuredData`. Search engines read them for rich results (the date,
// place and picture of an event in the search listing); link previews
// ignore them and read the og:* tags instead.

const TIME_ZONE = 'Europe/Stockholm';

// "2026-11-03T14:00:00+01:00": the local time with the offset it has in
// Sweden that day (+01:00 in winter, +02:00 in summer).
export function zonedDateTime(date: string, time?: string): string {
  const clock = /^\d{2}:\d{2}$/.test(time || '') ? (time as string) : '00:00';
  let offset = '+01:00';
  try {
    const name = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(`${date}T${clock}:00Z`))
      .find((part) => part.type === 'timeZoneName')?.value;
    if (name) {
      offset = name === 'GMT' ? '+00:00' : name.replace('GMT', '');
    }
  } catch {
    // An engine without longOffset keeps the winter offset
  }
  return `${date}T${clock}:00${offset}`;
}

const postalAddress = (address?: Partial<Address> | null) =>
  address?.city
    ? {
        '@type': 'PostalAddress',
        ...(address.street ? { streetAddress: address.street } : {}),
        ...(address.postalCode ? { postalCode: address.postalCode } : {}),
        addressLocality: address.city,
        addressCountry: 'SE',
      }
    : undefined;

const geo = (coordinates?: { lat: number; lng: number } | null) =>
  coordinates
    ? {
        '@type': 'GeoCoordinates',
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      }
    : undefined;

interface DateEntry {
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface EventData {
  title?: string;
  description?: string;
  url: string;
  images: string[];
  datesAndTimes?: DateEntry[];
  /** The venue's name ("Tranemo bibliotek") */
  venue?: string | null;
  /** The place (ort) it belongs to */
  locationName?: string | null;
  address?: Partial<Address> | null;
  organizer?: { name: string; url?: string } | null;
  isArchived?: boolean;
}

// One Event per date still to come (at most ten), or the last one once
// it has passed, so a series shows each of its dates.
export function eventStructuredData(event: EventData): object[] | null {
  if (!event.title) {
    return null;
  }
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...(event.datesAndTimes || [])].sort((a, b) =>
    `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`)
  );
  const upcoming = sorted.filter((d) => (d.endDate || d.startDate) >= today);
  const shown = upcoming.length ? upcoming.slice(0, 10) : sorted.slice(-1);
  if (!shown.length) {
    return null;
  }

  const address = postalAddress(event.address);
  const location = {
    '@type': 'Place',
    name: event.venue || event.locationName || address?.addressLocality,
    ...(address ? { address } : {}),
    ...(event.address?.coordinates
      ? { geo: geo(event.address.coordinates) }
      : {}),
  };

  return shown.map((d) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    ...(event.description ? { description: event.description } : {}),
    url: event.url,
    ...(event.images.length ? { image: event.images } : {}),
    startDate: zonedDateTime(d.startDate, d.startTime),
    endDate: zonedDateTime(d.endDate || d.startDate, d.endTime || d.startTime),
    eventStatus: event.isArchived
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location,
    ...(event.organizer
      ? { organizer: { '@type': 'Organization', ...event.organizer } }
      : {}),
  }));
}

export interface PlaceData {
  name?: string;
  description?: string;
  url: string;
  image?: string | null;
  coordinates?: { lat: number; lng: number } | null;
}

// A place (ort) in the municipality
export function placeStructuredData(place: PlaceData): object | null {
  if (!place.name) {
    return null;
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: place.name,
    ...(place.description ? { description: place.description } : {}),
    url: place.url,
    ...(place.image ? { image: place.image } : {}),
    ...(place.coordinates ? { geo: geo(place.coordinates) } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: place.name,
      addressCountry: 'SE',
    },
  };
}

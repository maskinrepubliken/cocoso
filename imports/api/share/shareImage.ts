import dayjs from 'dayjs';

import { publicUrl } from '/imports/api/_utils/shared';

// The generated share images: a 1200×630 picture with an entry's title,
// place and date that link previews (Facebook, Messenger, WhatsApp,
// iMessage, Slack, …) show instead of a bare photo. They are drawn by the
// server on first request (shareImage.server.tsx) and kept on disk until
// the entry no longer needs them.
//
// This half is shared: the page that is being shared knows from the same
// data which picture the server will draw, and puts a fingerprint of it in
// the image's URL. When the title, place or next date changes, the URL
// changes too, so the services that cache previews fetch the new one.
// Nothing in the picture depends on the day it is drawn, because a cached
// preview is shown for as long as the post that carries it.

export const SHARE_IMAGE_ROUTE = '/share-image';
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;

// Bump when the drawing changes, so every image is drawn anew.
const DESIGN_VERSION = 3;

export type ShareImageKind = 'activity' | 'location';

// FNV-1a, as a short base-36 string.
function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0).toString(36);
}

interface DateEntry {
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface ShareableActivity {
  _id?: string;
  title?: string;
  resource?: string;
  place?: string;
  locationId?: string | null;
  images?: unknown[];
  imageUrl?: unknown;
  datesAndTimes?: DateEntry[];
  isArchived?: boolean;
}

export interface ShareableLocation {
  _id?: string;
  name?: string;
  description?: string;
  images?: unknown[];
  colorKey?: string | null;
  order?: number;
}

const today = () => dayjs().format('YYYY-MM-DD');

// The occurrences still to come, today's included.
export function upcomingOccurrences<T extends DateEntry>(
  datesAndTimes: T[] | undefined,
  day: string = today()
): T[] {
  return (datesAndTimes || []).filter((d) => (d.endDate || d.startDate) >= day);
}

// An event keeps its picture while it has dates left; after that the
// picture is removed and the event's own photo (or the site's) is shared.
export function activityHasShareImage(activity: ShareableActivity): boolean {
  return (
    Boolean(activity?._id) &&
    !activity.isArchived &&
    upcomingOccurrences(activity.datesAndTimes).length > 0
  );
}

// Only what is drawn, and nothing that changes with the day: the picture
// (and so its URL, which the services cache by) stays the same until the
// event itself is edited.
export function activityShareFingerprint(activity: ShareableActivity): string {
  const dates = (activity.datesAndTimes || [])
    .map((d) => [d.startDate, d.startTime, d.endDate, d.endTime].join(' '))
    .sort();
  return hashString(
    JSON.stringify([
      DESIGN_VERSION,
      activity.title,
      activity.resource || activity.place,
      activity.locationId,
      (activity.images && activity.images[0]) || activity.imageUrl,
      dates,
    ])
  );
}

export function locationShareFingerprint(location: ShareableLocation): string {
  return hashString(
    JSON.stringify([
      DESIGN_VERSION,
      location.name,
      location.description,
      location.images?.[0],
      location.colorKey,
      location.order,
    ])
  );
}

export function shareImageUrl(
  kind: ShareImageKind,
  id: string,
  fingerprint: string
): string {
  return publicUrl(`${SHARE_IMAGE_ROUTE}/${kind}/${id}.jpg?v=${fingerprint}`);
}

// The share image of an event, or null once it has no dates left.
export function activityShareImageUrl(
  activity: ShareableActivity
): string | null {
  if (!activityHasShareImage(activity)) {
    return null;
  }
  return shareImageUrl(
    'activity',
    activity._id as string,
    activityShareFingerprint(activity)
  );
}

export function locationShareImageUrl(
  location: ShareableLocation
): string | null {
  if (!location?._id) {
    return null;
  }
  return shareImageUrl(
    'location',
    location._id,
    locationShareFingerprint(location)
  );
}

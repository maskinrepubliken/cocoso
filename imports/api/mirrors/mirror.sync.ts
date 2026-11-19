import { Meteor } from 'meteor/meteor';
import DOMPurify from 'isomorphic-dompurify';

import Activities from '../activities/activity';
import Resources from '../resources/resource';
import { setActivityCancelled } from '../activities/activity.cancel';
import { cleanKinds } from '../_utils/kinds';
import { EVENT_KIND_KEYS } from '../../ui/pages/activities/eventKinds';
import { processImage } from '../_utils/services/imageProcessor';
import {
  deleteMultipleMedia,
  sanitizeSegment,
  saveMedia,
} from '../_utils/services/mediaStorage';
import { warmShareImage } from '../share/shareImage.server';
import escapeHtml from '../_utils/escapeHtml';
import Mirrors, { type MirrorDoc } from './mirror';
import { fetchAxiellEvents, type SourceEvent } from './axiell';
import { fetchBioSeEvents } from './bioSe';

/**
 * Running a mirror: the source's events still to come at its place, made
 * into events in Cocoso and kept like the source.
 *
 * - New at the source: added, public and published, with sign-up closed
 *   (people sign up or buy their ticket at the source; the text links
 *   there).
 * - Changed: title, text, time, picture and kinds rewritten. Those
 *   following are not told; the source is where the event is kept.
 * - Cancelled at the source: marked cancelled (setActivityCancelled), which
 *   does tell those following, and unmarked if the source takes it back.
 * - Gone from the source while still to come: deleted. (A cinema's
 *   screening may leave bio.se as it begins, so one that has begun is
 *   kept.)
 * - Detached by its organizer (mirror.isDetached): left alone.
 *
 * Runs every hour for each enabled mirror, and from Admin →
 * Speglingar ("Synka nu"). Server only.
 */

const ZONE = 'Europe/Stockholm';
const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_MS = 60 * 1000;

// The source's tags (Knallebiblioteken's) to Cocoso's kinds
// (imports/ui/pages/activities/eventKinds.ts)
const TAG_KINDS: Record<string, string> = {
  sagostund: 'barn',
  ramsor: 'barn',
  sång: 'barn',
  pyssel: 'barn',
  läslov: 'barn',
  knallenallen: 'barn',
  litteratur: 'kultur',
  boktips: 'kultur',
  bokcirkel: 'kultur',
  bokklubb: 'kultur',
  läsecirkel: 'kultur',
  högläsning: 'kultur',
  författarbesök: 'kultur',
  knalleläser: 'kultur',
  musik: 'kultur',
  teater: 'kultur',
  dans: 'kultur',
  skriva: 'kultur',
  skapa: 'kultur',
  film: 'bio',
  teknik: 'larande',
  'it-support': 'larande',
  digitalt: 'larande',
  föreläsning: 'larande',
  workshop: 'larande',
  rådgivning: 'larande',
  släktforskning: 'larande',
  språkcafé: 'larande',
  emedborgarveckan: 'larande',
  demokrati: 'larande',
  fika: 'social',
  stickcafé: 'social',
  boktipscafé: 'social',
  spel: 'social',
  fröbibliotek: 'natur',
};

export function kindsForTags(tags: string[], fallback: string[] = []) {
  const kinds = tags
    .map((tag) => TAG_KINDS[tag.trim().toLowerCase()])
    .filter(Boolean);
  const cleaned = cleanKinds(kinds, EVENT_KIND_KEYS);
  return cleaned.length > 0 ? cleaned : cleanKinds(fallback, EVENT_KIND_KEYS);
}

// "2026-11-16T14:00:00Z" → { date: '2026-11-16', time: '15:00' } in Sweden
const localParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function localDateTime(when: Date) {
  const part = (type: string) =>
    localParts.formatToParts(when).find((p) => p.type === type)?.value || '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

// The source's text as Cocoso stores it: its paragraphs, lists and links,
// without the inline fonts and sizes of the editor it was written in, and
// a last line linking to the event at the source. A cinema's screening
// also links to the cinema's own site, when the mirror has it.
export function describe(event: SourceEvent, mirror: MirrorDoc) {
  const isCinema = mirror.kind === 'bio-se';
  const link = `<p><a href="${escapeHtml(sourceUrl(event, mirror))}">${
    isCinema ? 'Läs mer och köp biljett hos' : 'Läs mer och anmäl dig hos'
  } ${escapeHtml(mirror.sourceName)} →</a></p>`;
  const cinemaLink =
    isCinema && mirror.cinemaUrl
      ? `<p><a href="${escapeHtml(mirror.cinemaUrl)}">${escapeHtml(
          mirror.sourceLocation
        )} – biografens egen sida →</a></p>`
      : '';
  return DOMPurify.sanitize(
    `${event.description || ''}\n${link}\n${cinemaLink}`,
    {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'a',
        'ul',
        'ol',
        'li',
        'h2',
        'h3',
        'h4',
        'blockquote',
      ],
      ALLOWED_ATTR: ['href'],
    }
  )
    .replace(/<p>(\s|&nbsp;|\u00a0)*<\/p>/g, '')
    .trim();
}

export const sourceUrl = (event: SourceEvent, mirror: MirrorDoc) =>
  event.url ||
  (mirror.eventUrl || '').replace('{id}', encodeURIComponent(event.id));

// The source's events still to come, read as the mirror's kind is read
function fetchEvents(mirror: MirrorDoc): Promise<SourceEvent[]> {
  switch (mirror.kind) {
    case 'bio-se':
      return fetchBioSeEvents(mirror);
    case 'axiell-events':
    default:
      return fetchAxiellEvents(mirror.customerId || '', mirror.sourceLocation);
  }
}

function datesOf(event: SourceEvent) {
  const start = localDateTime(event.start);
  const end = localDateTime(event.end < event.start ? event.start : event.end);
  return {
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
  };
}

// The source's picture, made into Cocoso's sizes and stored with the
// event's own pictures; returns the full size's address
async function storePicture(
  mirror: MirrorDoc,
  event: SourceEvent
): Promise<string | null> {
  if (!event.imageUrl) {
    return null;
  }
  const response = await fetch(event.imageUrl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`picture: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const { variants } = await processImage(buffer, 'entry');
  // A new folder for each new picture, so browsers don't keep the old one
  const folder = `images/mirror-${sanitizeSegment(
    mirror._id
  )}/${sanitizeSegment(event.id)}-${Date.now().toString(36)}`;
  const urls = await Promise.all(
    variants.map((variant) =>
      saveMedia(variant.buffer, `${folder}/${variant.suffix}.webp`)
    )
  );
  const full = variants.findIndex((variant) => variant.suffix === 'full');
  return urls[full >= 0 ? full : urls.length - 1];
}

// Every size of a picture stored by storePicture
const picturesOf = (url?: string) =>
  url && url.includes('/images/mirror-')
    ? ['thumb', 'small', 'medium', 'full'].map((size) =>
        url.replace(/\/full\.webp$/, `/${size}.webp`)
      )
    : [];

// Whether the event's last date is still to come, in Swedish time: not
// yet over, or with notBegun not yet begun
function isStillToCome(
  activity: any,
  now: { date: string; time: string },
  notBegun = false
) {
  const dates = activity.datesAndTimes || [];
  const last = dates[dates.length - 1];
  if (!last) {
    return false;
  }
  const edge = notBegun
    ? `${last.startDate} ${last.startTime}`
    : `${last.endDate} ${last.endTime}`;
  return edge > `${now.date} ${now.time}`;
}

export interface MirrorRunResult {
  created: number;
  updated: number;
  removed: number;
  // What a dry run would do, per event
  preview?: {
    action: 'create' | 'update' | 'keep' | 'detached';
    title: string;
    startDate: string;
    startTime: string;
    endTime: string;
    kinds: string[];
    isCancelled: boolean;
  }[];
}

export async function syncMirror(
  mirror: MirrorDoc,
  { dryRun = false }: { dryRun?: boolean } = {}
): Promise<MirrorRunResult> {
  const resource = await Resources.findOneAsync(mirror.resourceId, {
    fields: { label: 1, locationId: 1, images: 1 },
  });
  if (!resource) {
    throw new Meteor.Error('not-found', 'The place in Cocoso is gone');
  }
  const organizer = await Meteor.users.findOneAsync(mirror.organizerId, {
    fields: { username: 1 },
  });
  if (!organizer) {
    throw new Meteor.Error('not-found', 'The organizer account is gone');
  }

  const events = await fetchEvents(mirror);
  const existing = await Activities.find({
    'mirror.mirrorId': mirror._id,
  }).fetchAsync();
  const byExternalId = new Map(
    existing.map((activity: any) => [activity.mirror.externalId, activity])
  );

  const result: MirrorRunResult = {
    created: 0,
    updated: 0,
    removed: 0,
    ...(dryRun ? { preview: [] } : {}),
  };
  const seen = new Set<string>();

  for (const event of events) {
    seen.add(event.id);
    const before: any = byExternalId.get(event.id);
    const dates = datesOf(event);
    const kinds = kindsForTags(event.tags, mirror.defaultKinds);
    const longDescription = describe(event, mirror);

    if (before?.mirror?.isDetached) {
      result.preview?.push({
        action: 'detached',
        title: before.title,
        ...dates,
        kinds,
        isCancelled: event.isCancelled,
      });
      continue;
    }

    const changed =
      !before ||
      before.resourceId !== resource._id ||
      before.authorId !== organizer._id ||
      before.title !== event.title ||
      before.longDescription !== longDescription ||
      JSON.stringify(
        (before.datesAndTimes || []).map((d: any) => [
          d.startDate,
          d.startTime,
          d.endDate,
          d.endTime,
        ])
      ) !==
        JSON.stringify([
          [dates.startDate, dates.startTime, dates.endDate, dates.endTime],
        ]) ||
      JSON.stringify(before.kinds || []) !== JSON.stringify(kinds) ||
      (before.mirror?.imageSource || '') !== (event.imageUrl || '');
    const cancelChanged =
      Boolean(before) && event.isCancelled !== Boolean(before.cancelledAt);

    if (dryRun) {
      result.preview?.push({
        action: !before
          ? 'create'
          : changed || cancelChanged
          ? 'update'
          : 'keep',
        title: event.title,
        ...dates,
        kinds,
        isCancelled: event.isCancelled,
      });
      if (!before) {
        result.created += 1;
      } else if (changed || cancelChanged) {
        result.updated += 1;
      }
      continue;
    }

    try {
      // The picture: the source's, made anew only when it changed;
      // without one, the place's
      let images: string[] | undefined = before?.images;
      let oldPictures: string[] = [];
      if ((before?.mirror?.imageSource || '') !== (event.imageUrl || '')) {
        const stored = await storePicture(mirror, event);
        oldPictures = picturesOf(before?.images?.[0]);
        images = stored ? [stored] : undefined;
      }
      if (!images?.length) {
        images = resource.images?.length ? [resource.images[0]] : [];
      }

      const mirrorFields = {
        mirrorId: mirror._id,
        kind: mirror.kind,
        externalId: event.id,
        sourceUrl: sourceUrl(event, mirror),
        ...(event.modifiedAt ? { sourceModifiedAt: event.modifiedAt } : {}),
        ...(event.imageUrl ? { imageSource: event.imageUrl } : {}),
        syncedAt: new Date(),
      };

      if (!before) {
        const activityId = await Activities.insertAsync({
          authorId: organizer._id,
          authorName: organizer.username,
          title: event.title,
          longDescription,
          images,
          kinds,
          resourceId: resource._id,
          resource: resource.label,
          ...(resource.locationId ? { locationId: resource.locationId } : {}),
          isMunicipalityOnly: false,
          datesAndTimes: [{ ...dates, attendees: [] }],
          isPublicActivity: true,
          isPublished: true,
          isSentForReview: false,
          // People sign up at the source; the text links there
          isRegistrationEnabled: false,
          ...(event.isCancelled ? { cancelledAt: new Date() } : {}),
          mirror: mirrorFields,
          creationDate: new Date(),
        } as any);
        warmShareImage('activity', activityId);
        result.created += 1;
        continue;
      }

      if (changed) {
        await Activities.updateAsync(
          { _id: before._id },
          {
            $set: {
              // The mirror's place and organizer, should they have changed
              authorId: organizer._id,
              authorName: organizer.username,
              resourceId: resource._id,
              resource: resource.label,
              ...(resource.locationId
                ? { locationId: resource.locationId }
                : {}),
              title: event.title,
              longDescription,
              images,
              kinds,
              // Sign-ups made here before stay with the date
              datesAndTimes: [
                {
                  ...dates,
                  attendees: before.datesAndTimes?.[0]?.attendees || [],
                },
              ],
              mirror: mirrorFields,
              latestUpdate: new Date(),
            },
          }
        );
        await deleteMultipleMedia(oldPictures).catch(() => null);
        warmShareImage('activity', before._id);
      }
      if (cancelChanged) {
        await setActivityCancelled(before, { cancelled: event.isCancelled });
      }
      if (changed || cancelChanged) {
        result.updated += 1;
      }
    } catch (error) {
      // One event that fails doesn't stop the others
      console.error(
        `[mirror] ${mirror.name}: ${event.id} failed`,
        (error as Error)?.message
      );
    }
  }

  // Gone from the source while still to come: deleted. An empty answer
  // with events still to come here is more likely a fault at the source,
  // so nothing is deleted on it.
  const now = localDateTime(new Date());
  const gone = existing.filter(
    (activity: any) =>
      !seen.has(activity.mirror.externalId) &&
      !activity.mirror.isDetached &&
      isStillToCome(activity, now, mirror.kind === 'bio-se')
  );
  if (events.length === 0 && gone.length > 0) {
    throw new Meteor.Error(
      'empty-source',
      'The source listed no events; none were removed'
    );
  }
  result.removed = gone.length;
  if (!dryRun) {
    for (const activity of gone as any[]) {
      await Activities.removeAsync({ _id: activity._id });
      await deleteMultipleMedia(picturesOf(activity.images?.[0])).catch(
        () => null
      );
    }
  }
  return result;
}

// One run of a mirror, with its outcome kept on it for the admin page
export async function runMirror(mirror: MirrorDoc): Promise<MirrorRunResult> {
  try {
    const result = await syncMirror(mirror);
    await Mirrors.updateAsync(
      { _id: mirror._id },
      { $set: { lastRun: { at: new Date(), ...result } } }
    );
    console.info(
      `[mirror] ${mirror.name}: ${result.created} new, ${result.updated} changed, ${result.removed} removed`
    );
    return result;
  } catch (error: any) {
    const reason = error?.reason || error?.message || String(error);
    await Mirrors.updateAsync(
      { _id: mirror._id },
      {
        $set: {
          lastRun: {
            at: new Date(),
            created: 0,
            updated: 0,
            removed: 0,
            error: reason,
          },
        },
      }
    );
    console.error(`[mirror] ${mirror.name} failed:`, reason);
    throw error;
  }
}

// One run at a time, so a slow source can't have two runs write the same
// events
let running = false;

export async function runEnabledMirrors() {
  if (running) {
    return;
  }
  running = true;
  try {
    const mirrors = await Mirrors.find({ isEnabled: true }).fetchAsync();
    for (const mirror of mirrors) {
      await runMirror(mirror).catch(() => null);
    }
  } finally {
    running = false;
  }
}

export async function runMirrorAlone(mirror: MirrorDoc) {
  if (running) {
    throw new Meteor.Error('busy', 'A mirror is running, try again shortly');
  }
  running = true;
  try {
    return await runMirror(mirror);
  } finally {
    running = false;
  }
}

if (Meteor.isServer) {
  Meteor.startup(() => {
    const tick = () =>
      runEnabledMirrors().catch((error) =>
        console.error('[mirror] runs failed', error)
      );
    Meteor.setTimeout(tick, FIRST_RUN_MS);
    Meteor.setInterval(tick, INTERVAL_MS);
  });
}

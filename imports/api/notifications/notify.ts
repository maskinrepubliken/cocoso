import { Meteor } from 'meteor/meteor';

import { getSite } from '../site/site';
import Activities from '../activities/activity';
import { attachPlaceAddress } from '../activities/activity.place';
import { activityUpdateEmail } from '../activities/activity.mails';
import { deliverEmail, getSmtpSettings } from '../_utils/services/mails/smtp';
import { extractEmailAddress } from '../_utils/services/mails/mail.helpers';
import {
  ActivityFollows,
  ActivityUpdates,
  DEFAULT_PREFS,
  type NotificationPrefs,
  PushSubscriptions,
} from './notification';
import { sendWebPush, type PushPayload } from './webPush';
import { listUnsubscribeHeaders, unsubscribeUrl } from './unsubscribeLinks';

/**
 * Sends notifications: push to a person's browsers, and updates about an
 * event by email and push to everyone signed up for or following it.
 * Server only.
 */

const lower = (email?: string) => (email || '').trim().toLowerCase();

export const prefsOf = (user: any) => ({
  ...DEFAULT_PREFS,
  ...((user?.notificationPrefs || {}) as NotificationPrefs),
});

export async function fromAddress(): Promise<string> {
  const site = await getSite();
  const fromEmail = extractEmailAddress(getSmtpSettings()?.fromEmail || '');
  const name = site?.settings?.name;
  return name ? `${name} <${fromEmail}>` : fromEmail;
}

// Every browser the person has allowed; returns how many it reached
export async function pushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  const subscriptions = await PushSubscriptions.find({ userId }).fetchAsync();
  let reached = 0;
  for (const subscription of subscriptions) {
    const result = await sendWebPush(subscription, payload);
    if (result.ok) {
      reached += 1;
      await PushSubscriptions.updateAsync(subscription._id, {
        $set: { lastSuccessAt: new Date() },
      });
    } else if (result.gone) {
      await PushSubscriptions.removeAsync(subscription._id);
    } else {
      console.warn(`[push] ${result.status} from push service`);
    }
  }
  return reached;
}

interface Recipient {
  email: string;
  firstName?: string;
  user?: any;
}

// Signed up for any date, or following; less anyone who muted the event
// and less the sender
async function recipientsOf(
  activity: any,
  exceptUserId?: string
): Promise<Recipient[]> {
  const byEmail = new Map<string, Recipient>();
  for (const occurrence of activity.datesAndTimes || []) {
    for (const attendee of occurrence.attendees || []) {
      const key = lower(attendee.email);
      if (key && !byEmail.has(key)) {
        byEmail.set(key, { email: attendee.email.trim() });
      }
    }
  }

  const follows = await ActivityFollows.find({
    activityId: activity._id,
  }).fetchAsync();
  const followerIds = follows
    .filter((follow) => follow.userId && !follow.muted)
    .map((follow) => follow.userId as string);
  const muted = new Set(
    follows
      .filter((follow) => follow.muted)
      .map((follow) => lower(follow.email))
  );

  const users = await Meteor.users
    .find(
      {
        $or: [
          { _id: { $in: followerIds } },
          {
            'emails.address': {
              $in: [...byEmail.values()].map((r) => r.email),
            },
          },
        ],
      },
      {
        fields: { emails: 1, firstName: 1, lang: 1, notificationPrefs: 1 },
      }
    )
    .fetchAsync();
  for (const user of users as any[]) {
    const email = user.emails?.[0]?.address;
    const key = lower(email);
    if (!key) {
      continue;
    }
    // The account's own address may differ from the one signed up with
    const signedUp = (user.emails || []).find((e: any) =>
      byEmail.has(lower(e.address))
    );
    const recipientKey = signedUp ? lower(signedUp.address) : key;
    byEmail.set(recipientKey, {
      email: (signedUp?.address || email) as string,
      firstName: user.firstName,
      user,
    });
  }

  return [...byEmail.entries()]
    .filter(([key, r]) => !muted.has(key) && r.user?._id !== exceptUserId)
    .map(([, r]) => r);
}

export async function countActivityAudience(activity: any): Promise<number> {
  return (await recipientsOf(activity)).length;
}

/**
 * Tells everyone signed up for or following the event: a message from the
 * organizer, or that its time or place changed. Each person gets email
 * and/or push as they chose in their profile; an address without an
 * account gets email. Returns what went out and logs it in activityUpdates.
 */
export async function notifyActivity({
  activityId,
  kind,
  message,
  changes,
  authorId,
}: {
  activityId: string;
  kind: 'message' | 'changed';
  message?: string;
  changes?: string[];
  authorId?: string;
}): Promise<{ emails: number; pushes: number; recipients: number }> {
  const stored = await Activities.findOneAsync(activityId);
  if (!stored) {
    return { emails: 0, pushes: 0, recipients: 0 };
  }
  const activity = await attachPlaceAddress(stored);
  const site = await getSite();
  const recipients = await recipientsOf(activity, authorId);
  if (recipients.length === 0 && kind === 'changed') {
    return { emails: 0, pushes: 0, recipients: 0 };
  }
  const from = await fromAddress();
  const siteLang = (site?.settings as any)?.lang || 'sv';

  let emails = 0;
  let pushes = 0;
  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    await Promise.allSettled(
      recipients.slice(i, i + BATCH).map(async (recipient) => {
        const prefs = prefsOf(recipient.user);
        const lang = recipient.user?.lang || siteLang;
        const target = {
          kind: 'activity' as const,
          email: recipient.email,
          activityId,
        };

        if (!recipient.user || prefs.eventEmail) {
          const mail = activityUpdateEmail({
            activity,
            site,
            lang,
            kind,
            message,
            changes: changes as any,
            stopUrl: await unsubscribeUrl(target),
          });
          try {
            await deliverEmail({
              from,
              to: recipient.email,
              subject: mail.subject,
              html: mail.html,
              text: mail.text,
              headers: await listUnsubscribeHeaders(target),
            });
            emails += 1;
          } catch (error) {
            console.error('[notify] email failed', (error as Error)?.message);
          }
        }

        if (recipient.user && prefs.eventPush) {
          const sv = lang !== 'en';
          pushes += await pushToUser(recipient.user._id, {
            title:
              kind === 'changed'
                ? `${sv ? 'Ändrat' : 'Changed'}: ${activity.title}`
                : activity.title,
            body:
              message ||
              (sv
                ? 'Tid eller plats är ändrad. Tryck för att se.'
                : 'The time or place has changed. Tap to see.'),
            url: `/activities/${activityId}`,
            tag: `activity-${activityId}`,
          });
        }
      })
    );
  }

  await ActivityUpdates.insertAsync({
    activityId,
    kind,
    ...(message ? { message } : {}),
    ...(changes ? { changes } : {}),
    ...(authorId ? { authorId } : {}),
    sentAt: new Date(),
    emails,
    pushes,
  } as any);
  console.info(
    `[notify] ${kind} for ${activityId}: ${emails} emails, ${pushes} pushes, ${recipients.length} recipients`
  );
  return { emails, pushes, recipients: recipients.length };
}

const occurrenceKey = (date: any) =>
  [date.startDate, date.startTime, date.endDate, date.endTime].join('|');
const placeKey = (activity: any) =>
  JSON.stringify([
    activity.resourceId || '',
    activity.address?.street || '',
    activity.address?.postalCode || '',
    activity.address?.city || '',
  ]);

// What a saved event changed that the people coming need to know
export function noticeableChanges(before: any, after: any): string[] {
  const changes: string[] = [];
  const dates = (activity: any) =>
    (activity.datesAndTimes || []).map(occurrenceKey).join(',');
  if (dates(before) !== dates(after)) {
    changes.push('time');
  }
  if (placeKey(before) !== placeKey(after)) {
    changes.push('place');
  }
  return changes;
}

// Changes are told a while after the last save, so an organizer correcting
// a slip twice sends one update — measured against the event as it was
// before the first save. The organizer may write a few words with the
// change in the event form (`message`; the latest one written counts).
// Lost on a restart; the organizer can still send a message.
const WAIT_MS = 5 * 60 * 1000;
const pending = new Map<
  string,
  { before: any; message?: string; editorId?: string; timer: NodeJS.Timeout }
>();

export function scheduleChangeNotice(
  before: any,
  { message, editorId }: { message?: string; editorId?: string } = {}
) {
  const id = before?._id;
  if (!id) {
    return;
  }
  const earlier = pending.get(id);
  if (earlier) {
    clearTimeout(earlier.timer);
  }
  const snapshot = earlier?.before || before;
  const words = message || earlier?.message;
  const editor = editorId || earlier?.editorId;
  const timer = setTimeout(async () => {
    pending.delete(id);
    try {
      const after = await Activities.findOneAsync(id);
      if (
        !after ||
        after.isArchived ||
        !after.isPublished ||
        !after.isPublicActivity
      ) {
        return;
      }
      const changes = noticeableChanges(snapshot, after);
      if (changes.length === 0 && words) {
        // Nothing moved, but the organizer had something to say
        await notifyActivity({
          activityId: id,
          kind: 'message',
          message: words,
          authorId: editor,
        });
      } else if (changes.length > 0) {
        await notifyActivity({
          activityId: id,
          kind: 'changed',
          changes,
          ...(words ? { message: words, authorId: editor } : {}),
        });
      }
    } catch (error) {
      console.error('[notify] change notice failed', error);
    }
  }, WAIT_MS);
  pending.set(id, {
    before: snapshot,
    message: words,
    editorId: editor,
    timer,
  });
}

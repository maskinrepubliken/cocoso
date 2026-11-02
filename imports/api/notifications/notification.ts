import { Mongo } from 'meteor/mongo';

/**
 * A browser that has allowed push notifications for a person: one document
 * per device and browser, keyed by the push service's endpoint. Removed when
 * the person turns push off there, or when the push service says the
 * subscription is gone.
 */
export interface PushSubscriptionDoc {
  _id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: Date;
  lastSuccessAt?: Date;
}

export const PushSubscriptions = new Mongo.Collection<PushSubscriptionDoc>(
  'pushSubscriptions'
);

/**
 * Who hears about changes to an event, apart from those signed up for it
 * (they always do). `userId`: a logged-in person following the event.
 * `muted`: an address that has asked not to hear about this event any more,
 * from the link in an update email — signed up or not.
 */
export interface ActivityFollowDoc {
  _id: string;
  activityId: string;
  userId?: string;
  email?: string;
  muted?: boolean;
  createdAt: Date;
}

export const ActivityFollows = new Mongo.Collection<ActivityFollowDoc>(
  'activityFollows'
);

/**
 * Every update sent about an event: by its organizer, or by the server when
 * the time or place changed. Shown on the event page and caps how many
 * an event sends in a day.
 */
export interface ActivityUpdateDoc {
  _id: string;
  activityId: string;
  kind: 'message' | 'changed';
  message?: string;
  changes?: string[];
  authorId?: string;
  sentAt: Date;
  emails: number;
  pushes: number;
}

export const ActivityUpdates = new Mongo.Collection<ActivityUpdateDoc>(
  'activityUpdates'
);

// The person's choices, on the user document as `notificationPrefs`
export interface NotificationPrefs {
  // On the site's mailing list (admins' newsletters)
  newsletter?: boolean;
  newsletterChangedAt?: Date;
  // Updates about events they follow or are signed up for
  eventEmail?: boolean;
  eventPush?: boolean;
}

export const DEFAULT_PREFS: Required<
  Pick<NotificationPrefs, 'newsletter' | 'eventEmail' | 'eventPush'>
> = {
  newsletter: false,
  eventEmail: true,
  eventPush: true,
};

import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import Activities from '../activities/activity';
import { isOrganizerOf } from '../activities/activity.organizers';
import { isAdmin } from '../users/user.roles';
import {
  ActivityFollows,
  ActivityUpdates,
  PushSubscriptions,
} from './notification';
import { getWebPushKeys } from './serverKeys';
import {
  countActivityAudience,
  notifyActivity,
  prefsOf,
  pushToUser,
} from './notify';
import {
  readUnsubscribeToken,
  type UnsubscribeTarget,
} from './unsubscribeLinks';

// An organizer may send this many messages about one event in a day
const MESSAGES_PER_DAY = 5;
const MESSAGE_MAX = 2000;

const lower = (email?: string) => (email || '').trim().toLowerCase();

async function requireUser() {
  const user = (await Meteor.userAsync()) as any;
  if (!user) {
    throw new Meteor.Error('not-logged-in', 'Log in first');
  }
  return user;
}

async function manageableActivity(activityId: string, user: any) {
  const activity = await Activities.findOneAsync({ _id: activityId });
  if (!activity) {
    throw new Meteor.Error('not-found', 'Activity not found');
  }
  if (!(isOrganizerOf(activity, user._id) || (await isAdmin(user._id)))) {
    throw new Meteor.Error('not-authorized', 'You are not allowed');
  }
  return activity;
}

// Stops what an unsubscribe link names; also for the one-click POST
export async function applyUnsubscribe(target: UnsubscribeTarget) {
  const email = lower(target.email);
  if (target.kind === 'newsletter') {
    await Meteor.users.updateAsync(
      { 'emails.address': new RegExp(`^${escapeRegExp(email)}$`, 'i') },
      {
        $set: {
          'notificationPrefs.newsletter': false,
          'notificationPrefs.newsletterChangedAt': new Date(),
        },
      },
      { multi: true }
    );
    return;
  }
  await ActivityFollows.upsertAsync(
    { activityId: target.activityId, email },
    {
      $set: { muted: true },
      $setOnInsert: { createdAt: new Date() },
    }
  );
  // A follower with this address stops following, too
  const user = await Meteor.users.findOneAsync(
    { 'emails.address': new RegExp(`^${escapeRegExp(email)}$`, 'i') },
    { fields: { _id: 1 } }
  );
  if (user) {
    await ActivityFollows.removeAsync({
      activityId: target.activityId,
      userId: user._id,
    });
  }
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const subscriptionPattern = Match.ObjectIncluding({
  endpoint: String,
  keys: Match.ObjectIncluding({ p256dh: String, auth: String }),
});

Meteor.methods({
  // What browsers subscribe to push with; public by design
  async getPushPublicKey() {
    return (await getWebPushKeys()).publicKey;
  },

  async savePushSubscription(subscription, userAgent) {
    check(subscription, subscriptionPattern);
    check(userAgent, Match.Maybe(String));
    const user = await requireUser();
    const { endpoint, keys } = subscription;
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 2048) {
      throw new Meteor.Error('invalid-subscription', 'Not a push endpoint');
    }
    // One browser, one owner: the person logged in there now
    await PushSubscriptions.upsertAsync(
      { endpoint },
      {
        $set: {
          userId: user._id,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          userAgent: (userAgent || '').slice(0, 300),
        },
        $setOnInsert: { createdAt: new Date() },
      }
    );
    return true;
  },

  async removePushSubscription(endpoint) {
    check(endpoint, String);
    const user = await requireUser();
    await PushSubscriptions.removeAsync({ endpoint, userId: user._id });
    return true;
  },

  async sendTestPush() {
    const user = await requireUser();
    const sv = user.lang !== 'en';
    const reached = await pushToUser(user._id, {
      title: sv ? 'Pushnotiser fungerar' : 'Push notifications work',
      body: sv
        ? 'Så här ser en notis från oss ut.'
        : 'This is what a notification from us looks like.',
      url: '/admin/my-profile/notifications',
      tag: 'test',
    });
    if (reached === 0) {
      throw new Meteor.Error(
        'push-not-delivered',
        'No browser could be reached'
      );
    }
    return reached;
  },

  // The profile's notification page
  async getMyNotificationSettings() {
    const user = await requireUser();
    const follows = await ActivityFollows.find(
      { userId: user._id },
      { sort: { createdAt: -1 } }
    ).fetchAsync();
    const activities = await Activities.find(
      { _id: { $in: follows.map((follow) => follow.activityId) } },
      { fields: { title: 1, isArchived: 1 } }
    ).fetchAsync();
    const titles = new Map(activities.map((a: any) => [a._id, a]));
    return {
      prefs: prefsOf(user),
      devices: await PushSubscriptions.find({ userId: user._id }).countAsync(),
      follows: follows
        .filter((follow) => titles.has(follow.activityId))
        .map((follow) => ({
          activityId: follow.activityId,
          title: (titles.get(follow.activityId) as any).title,
        })),
    };
  },

  async setNotificationPrefs(prefs) {
    check(prefs, {
      newsletter: Match.Maybe(Boolean),
      eventEmail: Match.Maybe(Boolean),
      eventPush: Match.Maybe(Boolean),
    });
    const user = await requireUser();
    const set: Record<string, unknown> = {};
    for (const key of ['newsletter', 'eventEmail', 'eventPush'] as const) {
      if (typeof prefs[key] === 'boolean') {
        set[`notificationPrefs.${key}`] = prefs[key];
      }
    }
    // When they joined or left the mailing list: their consent, on record
    if ('notificationPrefs.newsletter' in set) {
      set['notificationPrefs.newsletterChangedAt'] = new Date();
    }
    if (Object.keys(set).length > 0) {
      await Meteor.users.updateAsync(user._id, { $set: set });
    }
    return prefsOf({
      notificationPrefs: { ...user.notificationPrefs, ...prefs },
    });
  },

  async getActivityFollowState(activityId) {
    check(activityId, String);
    const user = (await Meteor.userAsync()) as any;
    if (!user) {
      return { isFollowing: false };
    }
    const follow = await ActivityFollows.findOneAsync({
      activityId,
      userId: user._id,
    });
    return { isFollowing: Boolean(follow) };
  },

  async followActivity(activityId) {
    check(activityId, String);
    const user = await requireUser();
    const activity = await Activities.findOneAsync(
      { _id: activityId, isArchived: { $ne: true } },
      { fields: { _id: 1 } }
    );
    if (!activity) {
      throw new Meteor.Error('not-found', 'Activity not found');
    }
    await ActivityFollows.upsertAsync(
      { activityId, userId: user._id },
      { $setOnInsert: { createdAt: new Date() } }
    );
    // Following again undoes a "stop updates" link they used before
    const emails = (user.emails || []).map((e: any) => lower(e.address));
    await ActivityFollows.removeAsync({
      activityId,
      email: { $in: emails },
      muted: true,
    });
    return true;
  },

  async unfollowActivity(activityId) {
    check(activityId, String);
    const user = await requireUser();
    await ActivityFollows.removeAsync({ activityId, userId: user._id });
    return true;
  },

  // How many an organizer's message would reach
  async getActivityAudience(activityId) {
    check(activityId, String);
    const user = await requireUser();
    const activity = await manageableActivity(activityId, user);
    return countActivityAudience(activity);
  },

  async sendActivityMessage(activityId, message) {
    check(activityId, String);
    check(message, String);
    const user = await requireUser();
    const activity = await manageableActivity(activityId, user);
    const text = message.trim();
    if (!text) {
      throw new Meteor.Error('empty-message', 'Write a message first');
    }
    if (text.length > MESSAGE_MAX) {
      throw new Meteor.Error('message-too-long', 'The message is too long');
    }
    if (activity.isArchived) {
      throw new Meteor.Error('archived', 'The event is archived');
    }
    const sentToday = await ActivityUpdates.find({
      activityId,
      kind: 'message',
      sentAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).countAsync();
    if (sentToday >= MESSAGES_PER_DAY) {
      throw new Meteor.Error(
        'too-many-messages',
        'Too many messages about this event today'
      );
    }
    return notifyActivity({
      activityId,
      kind: 'message',
      message: text,
      authorId: user._id,
    });
  },

  // The organizer's messages, shown on the event page
  async getActivityUpdates(activityId) {
    check(activityId, String);
    const activity = await Activities.findOneAsync(
      { _id: activityId },
      { fields: { isPublished: 1, isArchived: 1, authorId: 1, organizers: 1 } }
    );
    if (!activity) {
      return [];
    }
    const user = (await Meteor.userAsync()) as any;
    const isVisible =
      (activity.isPublished && !activity.isArchived) ||
      (user &&
        (isOrganizerOf(activity, user._id) || (await isAdmin(user._id))));
    if (!isVisible) {
      return [];
    }
    return ActivityUpdates.find(
      { activityId, kind: 'message' },
      { fields: { message: 1, sentAt: 1 }, sort: { sentAt: -1 }, limit: 10 }
    ).fetchAsync();
  },

  // The unsubscribe page: what the link stops, before the click
  async describeUnsubscribe(token) {
    check(token, String);
    const target = await readUnsubscribeToken(token);
    if (!target) {
      throw new Meteor.Error('invalid-link', 'This link is not valid');
    }
    if (target.kind === 'activity') {
      const activity = await Activities.findOneAsync(target.activityId, {
        fields: { title: 1 },
      });
      return {
        kind: target.kind,
        email: target.email,
        activityId: target.activityId,
        title: activity?.title || '',
      };
    }
    return { kind: target.kind, email: target.email };
  },

  async unsubscribe(token) {
    check(token, String);
    const target = await readUnsubscribeToken(token);
    if (!target) {
      throw new Meteor.Error('invalid-link', 'This link is not valid');
    }
    await applyUnsubscribe(target);
    return true;
  },
});

Meteor.startup(async () => {
  await PushSubscriptions.createIndexAsync({ endpoint: 1 }, { unique: true });
  await PushSubscriptions.createIndexAsync({ userId: 1 });
  await ActivityFollows.createIndexAsync({ activityId: 1, userId: 1 });
  await ActivityFollows.createIndexAsync({ userId: 1 });
  await ActivityUpdates.createIndexAsync({ activityId: 1, sentAt: -1 });
});

import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

import { isContributor, isContributorOrAdmin } from '../users/user.roles';
import { isReachable } from '../_utils/contact';
import Activities from './activity';

// The people behind an event: the author plus any co-organizers. All of
// them may manage the event, and their public contact details are shown
// on its page.

export { ContactPattern, cleanContact } from '../_utils/contact';

// An organizer is a contributor, or anyone named as author or co-organizer
// of an event. Organizers always have public contact details: an email or
// a phone visitors can use.
export const isOrganizer = async (userId) =>
  Boolean(
    userId &&
      ((await isContributor(userId)) ||
        (await Activities.findOneAsync(
          { $or: [{ authorId: userId }, { 'organizers.userId': userId }] },
          { fields: { _id: 1 } }
        )))
  );

// Throws unless every one of these users has an email or a phone in their
// public contact details, naming those who do not.
export const requireOrganizerContact = async (userIds) => {
  if (!userIds || userIds.length === 0) {
    return;
  }
  const users = await Meteor.users
    .find(
      { _id: { $in: userIds } },
      { fields: { username: 1, publicContact: 1 } }
    )
    .fetchAsync();
  const missing = users.filter((u) => !isReachable(u.publicContact));
  if (missing.length > 0) {
    throw new Meteor.Error(
      'organizer-contact-required',
      `Organizers need an email or a phone in their profile: ${missing
        .map((u) => u.username)
        .join(', ')}`
    );
  }
};

export const isOrganizerOf = (activity, userId) =>
  Boolean(
    userId &&
      activity &&
      (activity.authorId === userId ||
        (activity.organizers || []).some((o) => o.userId === userId))
  );

// Turn the chosen co-organizer ids into {userId, username} pairs, keeping
// only existing users who may publish content. The author is never listed
// twice.
export const resolveOrganizers = async (organizers, authorId) => {
  if (!organizers) {
    return [];
  }
  check(organizers, [Match.ObjectIncluding({ userId: String })]);
  const ids = [...new Set(organizers.map((o) => o.userId))].filter(
    (id) => id !== authorId
  );
  if (ids.length === 0) {
    return [];
  }
  const users = await Meteor.users
    .find({ _id: { $in: ids } }, { fields: { username: 1 } })
    .fetchAsync();
  const allowed = (
    await Promise.all(
      users.map(async (u) => (await isContributorOrAdmin(u._id)) && u)
    )
  ).filter(Boolean);
  await requireOrganizerContact(allowed.map((u) => u._id));
  return allowed
    .filter(Boolean)
    .map((u) => ({ userId: u._id, username: u.username }));
};

// Whose profile contact details the event shows: the author or one of
// its co-organizers, and only when it has no contact details of its own.
export const resolveContactUserId = (
  contactUserId,
  contact,
  authorId,
  organizers
) => {
  if (contact || typeof contactUserId !== 'string' || !contactUserId) {
    return null;
  }
  const ids = [authorId, ...(organizers || []).map((o) => o.userId)];
  return ids.includes(contactUserId) ? contactUserId : null;
};

// What the event page shows about each organizer: name, picture and the
// contact details they chose to make public. The author comes first.
export const attachOrganizerProfiles = async (activity) => {
  if (!activity) {
    return activity;
  }
  const ids = [
    activity.authorId,
    ...(activity.organizers || []).map((o) => o.userId),
  ].filter(Boolean);
  const users = await Meteor.users
    .find(
      { _id: { $in: ids } },
      {
        fields: {
          username: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
          publicContact: 1,
        },
      }
    )
    .fetchAsync();
  const byId = Object.fromEntries(users.map((u) => [u._id, u]));
  const organizerProfiles = ids
    .map((id) => byId[id])
    .filter(Boolean)
    .map((u) => ({
      userId: u._id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar,
      publicContact: u.publicContact || null,
    }));
  return { ...activity, organizerProfiles };
};

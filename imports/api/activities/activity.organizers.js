import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

import { emailIsValid } from '../_utils/shared';
import { isContributorOrAdmin } from '../users/user.roles';

// The people behind an event: the author plus any co-organizers. All of
// them may manage the event, and their public contact details are shown
// on its page.

export const ContactPattern = Match.Maybe(
  Match.OneOf(null, {
    email: Match.Maybe(String),
    phone: Match.Maybe(String),
    website: Match.Maybe(String),
  })
);

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

// A contact object with only the filled-in fields, or null when empty.
// Throws on an email that cannot be an address, so a typo does not end up
// on the public page.
export const cleanContact = (contact) => {
  if (!contact) {
    return null;
  }
  check(contact, ContactPattern);
  const email = trimmed(contact.email);
  const phone = trimmed(contact.phone);
  let website = trimmed(contact.website);
  if (email && !emailIsValid(email)) {
    throw new Meteor.Error('invalid-email', 'The contact email is not valid');
  }
  if (website && !/^https?:\/\//i.test(website)) {
    website = `https://${website}`;
  }
  const cleaned = {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(website ? { website } : {}),
  };
  return Object.keys(cleaned).length > 0 ? cleaned : null;
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
  const allowed = await Promise.all(
    users.map(async (u) => (await isContributorOrAdmin(u._id)) && u)
  );
  return allowed
    .filter(Boolean)
    .map((u) => ({ userId: u._id, username: u.username }));
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

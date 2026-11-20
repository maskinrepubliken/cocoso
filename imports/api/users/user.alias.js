import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Random } from 'meteor/random';

import Activities from '../activities/activity';
import Memberships from '../memberships/membership';
import Mirrors from '../mirrors/mirror';
import Resources from '../resources/resource';
import { ContactPattern, requireContact } from '../_utils/contact';
import { isAdmin } from './user.roles';
import { generateUniqueUsername } from './username.helpers';

/**
 * Aliases: organizer profiles without a login. An admin makes one to
 * publish in someone else's name — an association, a choir, a venue — and
 * every admin may then choose it as the organizer of an event, a place or
 * a mirrored calendar.
 *
 * An alias is an ordinary user document with `isAlias: true` and no
 * `emails`, plus a contributor membership listed among the organizers. So
 * its page, its events and every "who organizes this" check work as for
 * any organizer, nobody can log in as it, and no email is ever sent to it.
 */

const NAME_MAX = 80;

async function requireAdmin() {
  const user = await Meteor.userAsync();
  if (!user || !(await isAdmin(user._id))) {
    throw new Meteor.Error('not-allowed', 'You are not allowed');
  }
  return user;
}

async function requireAlias(aliasId) {
  const alias = await Meteor.users.findOneAsync(
    { _id: aliasId },
    { fields: { username: 1, firstName: 1, isAlias: 1 } }
  );
  if (!alias || !alias.isAlias) {
    throw new Meteor.Error('not-an-alias', 'No such alias');
  }
  return alias;
}

// "Tranemo kammarkör" → "tranemokammarkor": å, ä and ö keep their letter
const usernameBase = (name) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '');

Meteor.methods({
  // The name and a way to reach the organizer are all an alias needs; the
  // picture and the rest of the profile are filled in afterwards, like any
  // profile an admin edits (saveUserInfoAsAdmin).
  async createAlias({ name, publicContact }) {
    check(name, String);
    check(publicContact, ContactPattern);
    const admin = await requireAdmin();

    const firstName = name.trim();
    if (!firstName || firstName.length > NAME_MAX) {
      throw new Meteor.Error('invalid-name', 'The alias needs a name');
    }
    // Organizers always have an email or a phone visitors can use
    const contact = requireContact(publicContact);

    const now = new Date();
    const userId = Random.id();
    const username = await generateUniqueUsername(usernameBase(firstName));
    await Meteor.users.insertAsync({
      _id: userId,
      username,
      createdAt: now,
      services: {},
      firstName,
      publicContact: contact,
      isAlias: true,
      isPublic: true,
      verifiedBy: { userId: admin._id, username: admin.username, date: now },
    });
    try {
      await Memberships.insertAsync({
        userId,
        role: 'contributor',
        isOrganizer: true,
        isPublic: true,
        joinDate: now,
      });
    } catch (error) {
      await Meteor.users.removeAsync({ _id: userId });
      throw error;
    }
    return { _id: userId, username };
  },

  // Only an alias nothing is published as: its events and mirrored
  // calendars have to be given another organizer, or removed, first.
  async deleteAlias(aliasId) {
    check(aliasId, String);
    await requireAdmin();
    await requireAlias(aliasId);

    const events = await Activities.find({
      $or: [{ authorId: aliasId }, { 'organizers.userId': aliasId }],
    }).countAsync();
    const mirrors = await Mirrors.find({ organizerId: aliasId }).countAsync();
    if (events > 0 || mirrors > 0) {
      throw new Meteor.Error(
        'alias-in-use',
        `The alias still organizes ${events} event(s) and ${mirrors} mirrored calendar(s)`,
        { events, mirrors }
      );
    }

    // No longer among those who look after a place
    await Resources.updateAsync(
      { managerIds: aliasId },
      { $pull: { managerIds: aliasId } },
      { multi: true }
    );
    await Memberships.removeAsync({ userId: aliasId });
    await Meteor.users.removeAsync({ _id: aliasId });
    return true;
  },
});

export { requireAdmin, requireAlias };

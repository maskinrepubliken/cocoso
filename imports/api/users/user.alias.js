import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';
import { Random } from 'meteor/random';

import Activities from '../activities/activity';
import Memberships from '../memberships/membership';
import Mirrors from '../mirrors/mirror';
import { getSite } from '../site/site';
import { ContactPattern, requireContact } from '../_utils/contact';
import { sitePath } from '../_utils/paths';
import { emailIsValid, publicUrl } from '../_utils/shared';
import { extractEmailAddress } from '../_utils/services/mails/mail.helpers';
import { deliverEmail, getSmtpSettings } from '../_utils/services/mails/smtp';
import { inviteEmail } from './inviteEmail';
import { isAdmin } from './user.roles';
import { detachUser } from './user.removal';
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
 *
 * An alias becomes a real account by getting an email address
 * (convertAliasToAccount): the same user document, so its username, page
 * and events stay. Its new owner is invited by email, logs in by code like
 * everyone else, and accepts the terms the first time (emailLogin.js).
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

// The invitation to an account made from an alias. Throws if it cannot
// be sent.
async function sendInvite(user, lang) {
  const email = user.emails[0].address;
  const site = await getSite();
  const siteName = site?.settings?.name || Meteor.settings.public?.name || '';
  const fromEmail = getSmtpSettings()?.fromEmail;
  const from =
    siteName && fromEmail
      ? `${siteName} <${extractEmailAddress(fromEmail)}>`
      : fromEmail;
  const { subject, html, text } = inviteEmail({
    lang,
    siteName,
    theme: site?.theme,
    name: user.firstName || user.username,
    email,
    url: publicUrl(sitePath('login')),
  });
  await deliverEmail({ from, to: email, subject, html, text });
}

// "Tranemo kammarkör" → "tranemokammarkor": å, ä and ö keep their letter
const usernameBase = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '');

Meteor.methods({
  // A name and an email address for visitors are all an alias needs; the
  // phone, the picture and the rest of the profile are filled in
  // afterwards, like any profile an admin edits (saveUserInfoAsAdmin).
  async createAlias({ name, publicContact }) {
    check(name, String);
    check(publicContact, ContactPattern);
    const admin = await requireAdmin();

    const firstName = name.trim();
    if (!firstName || firstName.length > NAME_MAX) {
      throw new Meteor.Error('invalid-name', 'The alias needs a name');
    }
    // Organizers can always be reached; a new alias by email
    const contact = requireContact(publicContact);
    if (!contact.email) {
      throw new Meteor.Error(
        'email-required',
        'The alias needs an email address'
      );
    }

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

  // What removing an alias leaves behind, for the question asked first:
  // its events, which stay without an organizer, and the mirrored
  // calendars that stop until they are given another one.
  async getAliasRemovalInfo(aliasId) {
    check(aliasId, String);
    await requireAdmin();
    await requireAlias(aliasId);
    return {
      events: await Activities.find({ authorId: aliasId }).countAsync(),
      mirrors: await Mirrors.find({ organizerId: aliasId }).countAsync(),
    };
  },

  // Removed like an account its owner deletes (detachUser): the events it
  // organizes stay, and say that the organizer has been removed.
  async deleteAlias(aliasId) {
    check(aliasId, String);
    await requireAdmin();
    await requireAlias(aliasId);

    await detachUser(aliasId);
    await Meteor.users.removeAsync({ _id: aliasId });
    return true;
  },

  // Hands an alias over to the organizer themself: with an email address
  // it is an account like any other, and no longer an alias the admins
  // publish as. The address is not verified until its owner logs in.
  async convertAliasToAccount(aliasId, rawEmail, lang) {
    check(aliasId, String);
    check(rawEmail, String);
    check(lang, Match.Maybe(String));
    await requireAdmin();
    const alias = await requireAlias(aliasId);

    const email = rawEmail.trim().toLowerCase();
    if (!emailIsValid(email)) {
      throw new Meteor.Error('invalid-email', 'Not a valid email address');
    }
    if (await Accounts.findUserByEmail(email)) {
      throw new Meteor.Error(
        'email-in-use',
        'There is already an account with this email address'
      );
    }

    const emails = [{ address: email, verified: false }];
    await Meteor.users.updateAsync(
      { _id: aliasId },
      { $set: { emails, invitedAt: new Date() }, $unset: { isAlias: '' } }
    );
    try {
      await sendInvite({ ...alias, emails }, lang);
    } catch (error) {
      // No invitation, no account: back to the alias it was
      console.error('[alias] could not send the invitation', error);
      await Meteor.users.updateAsync(
        { _id: aliasId },
        { $set: { isAlias: true }, $unset: { emails: '', invitedAt: '' } }
      );
      throw new Meteor.Error('email-failed', 'Could not send the email');
    }
    return true;
  },

  // The invitation once more, as long as the account has not been logged
  // in to.
  async resendAccountInvite(userId, lang) {
    check(userId, String);
    check(lang, Match.Maybe(String));
    await requireAdmin();
    const user = await Meteor.users.findOneAsync(
      { _id: userId },
      {
        fields: {
          username: 1,
          firstName: 1,
          emails: 1,
          invitedAt: 1,
          termsAcceptedAt: 1,
        },
      }
    );
    if (!user?.invitedAt || user.termsAcceptedAt || !user.emails?.[0]) {
      throw new Meteor.Error('not-invited', 'No invitation is waiting');
    }
    try {
      await sendInvite(user, lang);
    } catch (error) {
      console.error('[alias] could not send the invitation', error);
      throw new Meteor.Error('email-failed', 'Could not send the email');
    }
    return true;
  },
});

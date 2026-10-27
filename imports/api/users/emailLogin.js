import crypto from 'crypto';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';

import { getSite } from '../site/site';
import { publicUrl } from '../_utils/shared';
import { extractEmailAddress } from '../_utils/services/mails/mail.helpers';
import {
  deliverEmail,
  getSmtpSettings,
} from '../_utils/services/mails/smtp';
import Memberships from '../memberships/membership';
import { generateUsernameFromEmail } from './username.helpers';
import { loginEmail } from './loginEmail';
import { sendWelcomeEmail } from '../_utils/services/mails/mail.methods';

/**
 * Email-only login: type your email, get a six-digit code and a one-click
 * link, and you're in. There is no password and no separate sign-up — an
 * address we haven't seen becomes a new participant on its first login.
 *
 * One pending request per address lives in `loginCodes`, hashed. A new
 * request replaces the old one; a code allows a few wrong guesses, then the
 * request is spent and a new one must be asked for.
 */

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const LoginCodes = new Mongo.Collection('loginCodes');

const sha256 = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const looksLikeEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sameHash = (a, b) =>
  a.length === b.length &&
  crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function sendLoginEmail({ email, code, token, lang, isNew }) {
  const site = await getSite();
  const siteName = site?.settings?.name || Meteor.settings.public?.name || '';
  const url = publicUrl(`/login?token=${token}`);

  const fromEmail = getSmtpSettings()?.fromEmail;
  const from =
    siteName && fromEmail
      ? `${siteName} <${extractEmailAddress(fromEmail)}>`
      : fromEmail;

  const { subject, html, text } = loginEmail({
    lang,
    siteName,
    theme: site?.theme,
    code,
    url,
    isNew,
  });

  await deliverEmail({ from, to: email, subject, html, text });
}

// The account behind an address, made on the spot the first time: a
// generated username (editable later), the address marked verified — they
// just proved they read it — and a participant membership, as sign-up used
// to give.
async function findOrCreateUser(email) {
  const existing = await Accounts.findUserByEmail(email);
  if (existing) {
    const entry = existing.emails?.find(
      (e) => normalizeEmail(e.address) === email
    );
    if (entry && !entry.verified) {
      await Meteor.users.updateAsync(
        { _id: existing._id, 'emails.address': entry.address },
        { $set: { 'emails.$.verified': true } }
      );
    }
    return existing._id;
  }

  const username = await generateUsernameFromEmail(email);
  const userId = await Accounts.createUserAsync({ email, username });
  await Meteor.users.updateAsync(
    { _id: userId },
    { $set: { 'emails.0.verified': true } }
  );

  if (!(await Memberships.findOneAsync({ userId }))) {
    await Memberships.insertAsync({
      userId,
      role: 'participant',
      joinDate: new Date(),
      isPublic: true,
    });
    Meteor.defer(async () => {
      try {
        await sendWelcomeEmail(userId);
      } catch (error) {
        console.error('[emailLogin] welcome email failed', error);
      }
    });
  }

  return userId;
}

const invalid = () =>
  new Meteor.Error('login-code-invalid', 'The code is wrong or has expired');

Meteor.methods({
  async requestLoginCode(rawEmail, lang) {
    check(rawEmail, String);
    check(lang, Match.Maybe(String));

    const email = normalizeEmail(rawEmail);
    if (!looksLikeEmail(email)) {
      throw new Meteor.Error('invalid-email', 'Not a valid email address');
    }

    // A double click or an impatient "send again" shouldn't fill the inbox.
    const pending = await LoginCodes.findOneAsync({ email });
    if (pending && Date.now() - pending.createdAt.getTime() < RESEND_AFTER_MS) {
      return true;
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const token = crypto.randomBytes(24).toString('hex');
    const now = new Date();

    await LoginCodes.removeAsync({ email });
    await LoginCodes.insertAsync({
      email,
      codeHash: sha256(code),
      tokenHash: sha256(token),
      attempts: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    });

    try {
      const isNew = !(await Accounts.findUserByEmail(email));
      await sendLoginEmail({ email, code, token, lang, isNew });
    } catch (error) {
      console.error('[emailLogin] could not send login email', error);
      await LoginCodes.removeAsync({ email });
      throw new Meteor.Error('email-failed', 'Could not send the email');
    }

    // Same answer whether or not the address has an account.
    return true;
  },
});

// Client side: Accounts.callLoginMethod({ methodArguments: [{ emailLogin:
// { email, code } }] }) or [{ emailLogin: { token } }] from the link.
Accounts.registerLoginHandler('emailLogin', async (options) => {
  if (!options?.emailLogin) {
    return undefined;
  }
  const { email: rawEmail, code, token } = options.emailLogin;

  let request;
  if (token) {
    check(token, String);
    request = await LoginCodes.findOneAsync({ tokenHash: sha256(token) });
  } else {
    check(rawEmail, String);
    check(code, String);
    const email = normalizeEmail(rawEmail);
    request = await LoginCodes.findOneAsync({ email });
    if (request && !sameHash(request.codeHash, sha256(code.trim()))) {
      const attempts = (request.attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await LoginCodes.removeAsync({ _id: request._id });
      } else {
        await LoginCodes.updateAsync({ _id: request._id }, { $set: { attempts } });
      }
      throw invalid();
    }
  }

  if (!request || request.expiresAt < new Date()) {
    throw invalid();
  }

  // Spent either way: a code or link logs in once.
  await LoginCodes.removeAsync({ _id: request._id });

  const userId = await findOrCreateUser(request.email);
  return { userId };
});

Meteor.startup(async () => {
  await LoginCodes.createIndexAsync({ email: 1 });
  await LoginCodes.createIndexAsync({ tokenHash: 1 });
  await LoginCodes.createIndexAsync({ expiresAt: 1 }, { expireAfterSeconds: 0 });
});

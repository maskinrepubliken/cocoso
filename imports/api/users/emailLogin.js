import crypto from 'crypto';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Accounts } from 'meteor/accounts-base';
import { Email } from 'meteor/email';
import { check, Match } from 'meteor/check';

import { getSite } from '../site/site';
import { publicUrl } from '../_utils/shared';
import escapeHtml from '../_utils/escapeHtml';
import { extractEmailAddress } from '../_utils/services/mails/mail.helpers';
import Memberships from '../memberships/membership';
import { generateUsernameFromEmail } from './username.helpers';

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

const STRINGS = {
  sv: {
    subject: (code, site) => `${code} är din inloggningskod till ${site}`,
    lead: (site) => `Här är din kod för att logga in på ${site}:`,
    button: 'Logga in',
    orLink: 'Eller klicka på knappen för att logga in direkt:',
    footer:
      'Koden och länken gäller i 15 minuter och kan bara användas en gång. Om du inte försökte logga in kan du bortse från det här mejlet.',
  },
  en: {
    subject: (code, site) => `${code} is your login code for ${site}`,
    lead: (site) => `Here is your code to log in to ${site}:`,
    button: 'Log in',
    orLink: 'Or use the button to log in directly:',
    footer:
      "The code and link are valid for 15 minutes and work once. If you didn't try to log in, you can ignore this email.",
  },
};

function loginEmailHtml({ s, siteName, code, url }) {
  const name = escapeHtml(siteName);
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2a26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px 28px;">
        <tr><td style="font-size:16px;line-height:1.5;">
          <p style="margin:0 0 16px;">${escapeHtml(s.lead(siteName))}</p>
          <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:8px;font-family:Menlo,Consolas,monospace;">${escapeHtml(code)}</p>
          <p style="margin:0 0 16px;">${escapeHtml(s.orLink)}</p>
          <p style="margin:0 0 28px;">
            <a href="${escapeHtml(url)}" style="display:inline-block;background:#2f5d3a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${escapeHtml(s.button)}</a>
          </p>
          <p style="margin:0;font-size:13px;color:#6b6860;">${escapeHtml(s.footer)}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#6b6860;">${name}</p>
    </td></tr>
  </table>
</body></html>`;
}

async function sendLoginEmail({ email, code, token, lang }) {
  const site = await getSite();
  const siteName = site?.settings?.name || Meteor.settings.public?.name || '';
  const s = STRINGS[lang] || STRINGS.sv;
  const url = publicUrl(`/login?token=${token}`);

  const fromEmail = Meteor.settings?.mailCredentials?.smtp?.fromEmail;
  const from =
    siteName && fromEmail
      ? `${siteName} <${extractEmailAddress(fromEmail)}>`
      : fromEmail;

  await Email.sendAsync({
    from,
    to: email,
    subject: s.subject(code, siteName),
    html: loginEmailHtml({ s, siteName, code, url }),
    text: `${s.lead(siteName)}\n\n${code}\n\n${s.orLink}\n${url}\n\n${s.footer}`,
  });
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
        await Meteor.callAsync('sendWelcomeEmail', userId);
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
      await sendLoginEmail({ email, code, token, lang });
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

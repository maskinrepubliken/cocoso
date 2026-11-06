import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import Memberships from '../memberships/membership';
import { getSite } from '../site/site';
import {
  isValidEmail,
  extractEmailAddress,
} from '../_utils/services/mails/mail.helpers';
import { deliverEmail, getSmtpSettings } from '../_utils/services/mails/smtp';
import {
  FEEDBACK_SUBJECTS,
  feedbackEmail,
  type FeedbackSubject,
} from './feedbackEmail';

const MAX_MESSAGE = 5000;

Meteor.methods({
  // "Ge feedback" in the footer and the cookie notice: emailed to every
  // admin. Open to visitors who are not signed in; rate limited in
  // startup/server/rateLimits.js. `website` is a field people never see:
  // if it is filled in, a bot sent the form and nothing is mailed.
  async sendFeedback({ subject, message, email, page, website }) {
    check(subject, Match.OneOf(...Object.keys(FEEDBACK_SUBJECTS)));
    check(message, String);
    check(email, Match.Maybe(String));
    check(page, Match.Maybe(String));
    check(website, Match.Maybe(String));

    if (website) {
      return true;
    }

    const text = message.trim();
    if (!text) {
      throw new Meteor.Error('message-required', 'Please write a message.');
    }
    if (text.length > MAX_MESSAGE) {
      throw new Meteor.Error('message-too-long', 'The message is too long.');
    }
    const replyTo = email?.trim() || undefined;
    if (replyTo && !isValidEmail(replyTo)) {
      throw new Meteor.Error(
        'invalid-email',
        'The email address is not valid.'
      );
    }

    const adminIds = (
      await Memberships.find(
        { role: 'admin' },
        { fields: { userId: 1 } }
      ).fetchAsync()
    ).map((m) => m.userId as string);
    const admins = await Meteor.users
      .find({ _id: { $in: adminIds } }, { fields: { emails: 1 } })
      .fetchAsync();
    const to = [
      ...new Set(admins.map((u) => u.emails?.[0]?.address).filter(Boolean)),
    ] as string[];
    if (!to.length) {
      throw new Meteor.Error('no-recipients', 'There is no one to send to.');
    }

    const user = await Meteor.userAsync();
    const site = await getSite();
    const siteName = site?.settings?.name || '';
    const mail = feedbackEmail({
      subject: subject as FeedbackSubject,
      message: text,
      email: replyTo,
      username: user?.username,
      page: page?.startsWith('/') ? page : undefined,
      siteName,
      theme: (site as { theme?: unknown } | undefined)?.theme,
    });
    const from = `${siteName} <${extractEmailAddress(
      getSmtpSettings()?.fromEmail || ''
    )}>`;

    // One mail per admin, so one bad address does not stop the rest
    const results = await Promise.allSettled(
      to.map((address) => deliverEmail({ from, to: address, replyTo, ...mail }))
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error('feedback email error', to[i], r.reason);
      }
    });
    if (!results.some((r) => r.status === 'fulfilled')) {
      throw new Meteor.Error('send-failed', 'The feedback could not be sent.');
    }
    return true;
  },
});

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import Newsletters from './newsletter';
import { isAdmin } from '../users/user.roles';
import escapeHtml from '../_utils/escapeHtml';
import { deliverEmail } from '../_utils/services/mails/smtp';
import { fromAddress } from '../notifications/notify';
import {
  listUnsubscribeHeaders,
  unsubscribeUrl,
} from '../notifications/unsubscribeLinks';

// The mailing list: everyone who has said yes to the newsletter on their
// profile's notification page. Nobody else gets it.
const onMailingList = { 'notificationPrefs.newsletter': true };

const STOP = {
  sv: {
    why: 'Du får det här eftersom du prenumererar på vårt nyhetsbrev.',
    link: 'Avsluta prenumerationen',
  },
  en: {
    why: 'You get this because you subscribe to our newsletter.',
    link: 'Unsubscribe',
  },
};

// The reader's own unsubscribe line, at the end of the newsletter
function withStopLine(html, url, lang) {
  const s = STOP[lang] || STOP.sv;
  const line = `<p style="margin:24px auto;max-width:440px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5c6b60;text-align:center;">${escapeHtml(
    s.why
  )} <a href="${escapeHtml(url)}" style="color:#5c6b60;">${escapeHtml(
    s.link
  )}</a></p>`;
  return html.includes('</body>')
    ? html.replace('</body>', `${line}</body>`)
    : `${html}${line}`;
}

Meteor.methods({
  async getNewsletters() {
    return await Newsletters.find(
      {},
      {
        fields: {
          _id: 1,
          authorUsername: 1,
          creationDate: 1,
          imageUrl: 1,
          subject: 1,
        },
        sort: { creationDate: -1 },
      }
    ).fetchAsync();
  },
  async getNewsletterById(newsletterId) {
    return await Newsletters.findOneAsync({
      _id: newsletterId,
    });
  },

  // How many are on the mailing list, for the admin's newsletter page
  async getMailingListCount() {
    const currentUser = await Meteor.userAsync();
    if (!currentUser || !(await isAdmin(currentUser._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    return Meteor.users.find(onMailingList).countAsync();
  },

  async sendNewsletter(email, emailHtml) {
    check(email, Object);
    check(emailHtml, String);

    if (!email?.subject) {
      throw new Meteor.Error('subject-required', 'Email subject is required');
    }

    const currentUser = await Meteor.userAsync();

    if (!currentUser || !(await isAdmin(currentUser._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }

    const members = (
      await Meteor.users
        .find(onMailingList, {
          fields: { username: 1, firstName: 1, emails: 1, lang: 1 },
          limit: 10000,
        })
        .fetchAsync()
    )
      .map((u) => ({
        _id: u._id,
        name: u.firstName || u.username,
        email: u.emails?.[0]?.address,
        lang: u.lang,
      }))
      .filter((member) => member.email);

    if (members.length === 0) {
      throw new Meteor.Error(
        'no-subscribers',
        'Nobody is on the mailing list yet'
      );
    }

    const newEmailId = await Newsletters.insertAsync({
      ...email,
      authorId: currentUser._id,
      authorUsername: currentUser.username,
      creationDate: new Date(),
    });

    const emailHtmlWithBrowserLink = emailHtml.replace(
      '[newsletter-id]',
      newEmailId
    );
    const from = await fromAddress();

    // In batches, so a long list doesn't hold every message in memory
    const BATCH_SIZE = 20;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (member) => {
          const target = { kind: 'newsletter', email: member.email };
          const html = withStopLine(
            emailHtmlWithBrowserLink.replace(
              '[username]',
              escapeHtml(member.name || '')
            ),
            await unsubscribeUrl(target),
            member.lang
          );
          try {
            await deliverEmail({
              from,
              to: member.email,
              subject: email.subject,
              html,
              headers: await listUnsubscribeHeaders(target),
            });
            sent += 1;
          } catch (error) {
            console.error('[newsletter] failed to send:', error?.message);
            failed += 1;
          }
        })
      );
    }

    console.log(`Newsletter ${newEmailId}: Sent ${sent}, Failed ${failed}`);

    return {
      newsletterId: newEmailId,
      sent,
      failed,
      total: members.length,
    };
  },
});

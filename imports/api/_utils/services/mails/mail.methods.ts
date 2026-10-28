import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { getSite } from '../../../site/site';
import { isValidEmail, extractEmailAddress } from './mail.helpers';
import { deliverEmail, getSmtpSettings } from './smtp';
import { roleEmail } from './roleEmails';
import type { MeteorUser } from '/imports/ui/types';

// Server-only helpers, not Meteor methods: as methods anyone could call them
// from the browser and send any HTML to any address in the site's name.

// Callers pass what they have; check() rejects a missing address or subject.
async function sendEmail(
  id: string | undefined,
  subjectEmail: string | undefined,
  textEmail: string,
  fromName?: string,
  // A plain-text part, for clients that show no HTML
  plainText?: string
): Promise<void> {
  check([id, subjectEmail, textEmail], [String]);
  if (!id) {
    return;
  }
  const fromEmail = getSmtpSettings()?.fromEmail || '';

  const isEmailValid = isValidEmail(id);

  let toEmail: string | undefined;
  if (isEmailValid) {
    toEmail = id;
  }
  if (!isEmailValid) {
    const user = (await Meteor.users.findOneAsync({
      $or: [{ _id: id }, { username: id }],
    })) as MeteorUser | undefined;
    toEmail = user?.emails?.[0]?.address;
  }

  if (!toEmail) {
    return;
  }

  let displayName = fromName;
  if (!displayName) {
    const site = await getSite();
    displayName = site?.settings?.name;
  }

  let fromEmailWithHostName = fromEmail;
  if (displayName) {
    const extractedEmail = extractEmailAddress(fromEmail);
    fromEmailWithHostName = `${displayName} <${extractedEmail}>`;
  }

  const data = {
    from: fromEmailWithHostName,
    to: toEmail,
    subject: subjectEmail,
    html: textEmail,
    ...(plainText ? { text: plainText } : {}),
  };

  try {
    await deliverEmail(data);
  } catch (error) {
    console.log('email error', error);
    throw new Meteor.Error(error as string);
  }
}

// The email for a new role, in the site's email design (roleEmails.js)
// with the site's own texts from Admin → E-post.
async function sendRoleEmail(
  userId: string,
  role: 'contributor' | 'admin'
): Promise<void> {
  const user = (await Meteor.users.findOneAsync(userId)) as
    | (MeteorUser & { firstName?: string })
    | undefined;
  const to = user?.emails?.[0]?.address;
  if (!to) {
    return;
  }
  const site = (await getSite()) as any;
  const siteName = site?.settings?.name || '';
  const { subject, html, text } = roleEmail({
    role,
    template: site?.emails?.[role === 'admin' ? 2 : 1],
    name: user?.firstName || user?.username || '',
    siteName,
    theme: site?.theme,
  });

  const fromEmail = getSmtpSettings()?.fromEmail || '';
  const from = siteName
    ? `${siteName} <${extractEmailAddress(fromEmail)}>`
    : fromEmail;
  await deliverEmail({ from, to, subject, html, text });
}

const sendNewContributorEmail = (userId: string) =>
  sendRoleEmail(userId, 'contributor');

const sendNewAdminEmail = (userId: string) => sendRoleEmail(userId, 'admin');

export { sendEmail, sendNewContributorEmail, sendNewAdminEmail };

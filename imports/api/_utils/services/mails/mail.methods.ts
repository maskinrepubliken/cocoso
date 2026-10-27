import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { getSite } from '../../../site/site';
import {
  isValidEmail,
  getEmailBody,
  extractEmailAddress,
  EmailTemplate,
} from './mail.helpers';
import { getWelcomeEmailBody } from './templates.mails';
import { deliverEmail, getSmtpSettings } from './smtp';
import type { MeteorUser } from '/imports/ui/types';

// Server-only helpers, not Meteor methods: as methods anyone could call them
// from the browser and send any HTML to any address in the site's name.

// Callers pass what they have; check() rejects a missing address or subject.
async function sendEmail(
  id: string | undefined,
  subjectEmail: string | undefined,
  textEmail: string,
  fromName?: string
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
  };

  try {
    await deliverEmail(data);
  } catch (error) {
    console.log('email error', error);
    throw new Meteor.Error(error as string);
  }
}

async function sendNewContributorEmail(userId: string): Promise<void> {
  const user = (await Meteor.users.findOneAsync(userId)) as
    | MeteorUser
    | undefined;
  const site = await getSite();
  const welcomeText = site && site.emails?.[1];

  const emailBody = getWelcomeEmailBody(
    welcomeText?.appeal,
    site as any,
    user?.username,
    welcomeText?.body
  );

  try {
    await sendEmail(user?.emails?.[0].address, welcomeText?.subject, emailBody);
  } catch (error) {
    throw new Meteor.Error(error as string);
  }
}

async function sendNewAdminEmail(userId: string): Promise<void> {
  const user = (await Meteor.users.findOneAsync(userId)) as
    | MeteorUser
    | undefined;
  const site = await getSite();
  const email = site && site.emails?.[2];

  try {
    await sendEmail(
      user?.emails?.[0].address,
      email?.subject,
      getEmailBody(email as EmailTemplate, user?.username || '')
    );
  } catch (error) {
    throw new Meteor.Error(error as string);
  }
}

export {
  sendEmail,
  sendNewContributorEmail,
  sendNewAdminEmail,
};

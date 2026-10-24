import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { onPageLoad } from 'meteor/server-render';
import { WebAppInternals } from 'meteor/webapp';

import serverRenderer from './serverRenderer';
import {
  getSmtpSettings,
  mailUrlFor,
} from '../../api/_utils/services/mails/smtp';
import './api';
import './media';
import './rateLimits';

const { cdnServer } = Meteor.settings;

function setupSMTP() {
  const smtp = getSmtpSettings();

  if (!smtp) {
    console.warn(
      process.env.MAIL_URL
        ? '[mail] using MAIL_URL from the environment'
        : '[mail] no SMTP settings found — email will NOT be sent'
    );
    return;
  }
  if (!smtp.password && !process.env.MAIL_URL) {
    console.warn(
      '[mail] no SMTP password — set SMTP_PASSWORD in the environment or .env; email will NOT be sent'
    );
    return;
  }

  // A MAIL_URL given in the environment wins over the settings.
  process.env.MAIL_URL = process.env.MAIL_URL || mailUrlFor(smtp);
  Accounts.emailTemplates.resetPassword.from = () => smtp.fromEmail;
  Accounts.emailTemplates.from = () => smtp.fromEmail;
  Accounts.emailTemplates.resetPassword.text = function (user, url) {
    const newUrl = url.replace('#/', '');
    return `To reset your password, simply click the link below. ${newUrl}`;
  };
}

Meteor.startup(async () => {
  setupSMTP();

  if (cdnServer) {
    WebAppInternals.setBundledJsCssPrefix(cdnServer);
  }

  onPageLoad(async (sink) => {
    try {
      await serverRenderer(sink);
    } catch (error) {
      console.error('SSR Error:', error);
      // Fallback to client-side rendering or error page
      sink.renderIntoElementById('root', '<div>Server rendering failed</div>');
    }
  });
});

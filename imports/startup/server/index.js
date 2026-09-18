import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { onPageLoad } from 'meteor/server-render';
import { WebAppInternals } from 'meteor/webapp';

import serverRenderer from './serverRenderer';
import './api';
import './migrations';
import './media';
import './rateLimits';

const { cdnServer } = Meteor.settings;

function setupSMTP() {
  const smtp = Meteor.settings?.mailCredentials?.smtp;

  if (!smtp) {
    console.warn(
      'SMTP settings not found in Meteor.settings.mailCredentials.smtp'
    );
    return;
  }

  process.env.MAIL_URL = `smtps://${encodeURIComponent(smtp.userName)}:${
    smtp.password
  }@${smtp.host}:${smtp.port}`;
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

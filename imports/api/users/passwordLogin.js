import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

import { isAdmin } from './user.roles';

/**
 * Everyone logs in by email (emailLogin.js). Passwords are kept only as a
 * way in for administrators should mail stop working — the form is at
 * /login?losenord and linked from nowhere. The first admin gets a generated
 * password when the server creates the site (startup/server/bootstrap.ts).
 */

const PASSWORD_LOGINS = new Set(['password', 'resetPassword']);

Accounts.validateLoginAttempt(async (attempt) => {
  // A deleted account is gone, even in the moment before its document is
  if (attempt.user?.deletionRequestedAt) {
    throw new Meteor.Error('account-deleted', 'This account has been deleted');
  }
  if (!attempt.allowed || !PASSWORD_LOGINS.has(attempt.type)) {
    return attempt.allowed;
  }
  if (await isAdmin(attempt.user?._id)) {
    return true;
  }
  throw new Meteor.Error(
    'password-login-disabled',
    'Log in with your email address instead'
  );
});

// No sign-up from the browser: accounts are made by email login, or for
// the first admin by the server at first start.
Accounts.config({ forbidClientAccountCreation: true });

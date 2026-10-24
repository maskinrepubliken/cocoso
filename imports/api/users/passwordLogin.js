import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

import Memberships from '../memberships/membership';
import { isAdmin } from './user.roles';

/**
 * Everyone logs in by email (emailLogin.js). Passwords are kept only as a
 * way in for administrators should mail stop working — the form is at
 * /login?losenord and linked from nowhere.
 *
 * The one exception is a fresh install: until someone is an admin, the
 * first-run /setup creates its account with a password and logs in with it.
 */

const isFreshInstall = async () =>
  !(await Memberships.findOneAsync({ role: 'admin' }));

const PASSWORD_LOGINS = new Set(['password', 'resetPassword']);

Accounts.validateLoginAttempt(async (attempt) => {
  if (!attempt.allowed || !PASSWORD_LOGINS.has(attempt.type)) {
    return attempt.allowed;
  }
  if ((await isAdmin(attempt.user?._id)) || (await isFreshInstall())) {
    return true;
  }
  throw new Meteor.Error(
    'password-login-disabled',
    'Log in with your email address instead'
  );
});

// No sign-up from the browser: accounts are made by email login, or by
// `createAccount` during setup.
Accounts.config({ forbidClientAccountCreation: true });

export { isFreshInstall };

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import i18next from 'i18next';

import { message } from '/imports/ui/generic/message';
import { call } from '../../../api/_utils/shared';

export const loginWithPasswordAsync = Meteor.promisify(
  Meteor.loginWithPassword
);

export async function loginWithPassword(
  username,
  password,
  isNewAccount = false
) {
  try {
    await loginWithPasswordAsync(username, password);
    if (isNewAccount) {
      await call('setSelfAsParticipant');
    }
    const translation = i18next.t('accounts:login.messages.success');
    message.success(translation);
  } catch (error) {
    message.error(
      error.error === 'password-login-disabled'
        ? i18next.t('accounts:emailLogin.errors.passwordDisabled')
        : error.reason
    );
  }
}

export async function createAccount(values) {
  check(values.email, String);
  check(values.username, String);
  check(values.password, String);
  try {
    await call('createAccount', values);
    await loginWithPassword(values.username, values.password, true);
  } catch (error) {
    message.error(error.error ? error.error.reason : error.reason);
  }
}

// Email-only login (imports/api/users/emailLogin.js): either the address
// and the six-digit code from the email, or the token from its link.
export function loginWithEmail(credentials) {
  return new Promise((resolve, reject) => {
    Accounts.callLoginMethod({
      methodArguments: [{ emailLogin: credentials }],
      userCallback: (error) => (error ? reject(error) : resolve()),
    });
  });
}

// Set just before a confirmed sign-up logs in, so the login page sends the
// new person to /welcome instead of their profile (LoginPage reads it once).
let newAccountPending = false;

export function markNewAccount(value = true) {
  newAccountPending = value;
}

export function takeNewAccount() {
  const pending = newAccountPending;
  newAccountPending = false;
  return pending;
}

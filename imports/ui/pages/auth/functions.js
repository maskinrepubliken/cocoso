import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';


export const loginWithPasswordAsync = Meteor.promisify(
  Meteor.loginWithPassword
);

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

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { getDefaultStore } from 'jotai';

import { viewAsAtom } from '../state';
import { call } from '../api/_utils/shared';

// "View as": an admin borrows a member's session to see the site the way
// that member sees it. The admin's own login token (and their end-to-end
// encryption key) are parked in localStorage for the switch back.
const TOKEN_KEY = 'cocoso.viewAs.adminToken';
const NAME_KEY = 'cocoso.viewAs.username';
const E2EE_KEY = 'e2ee_pk';
const E2EE_PARKED_KEY = 'cocoso.viewAs.e2ee_pk';

const storage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

// The username being viewed as, or null when the admin is themself.
export function getViewAsUsername(): string | null {
  const s = storage();
  if (!s || !s.getItem(TOKEN_KEY)) {
    return null;
  }
  return s.getItem(NAME_KEY);
}

export function restoreViewAsState() {
  getDefaultStore().set(viewAsAtom, getViewAsUsername());
}

function loginWithToken(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Meteor.loginWithToken(token, (error?: Error) =>
      error ? reject(error) : resolve()
    );
  });
}

function logout(): Promise<void> {
  return new Promise((resolve) => {
    Meteor.logout(() => resolve());
  });
}

export async function startViewAs(memberId: string, username: string) {
  const s = storage();
  if (!s) {
    throw new Error('no-storage');
  }
  if (s.getItem(TOKEN_KEY)) {
    throw new Error('already-viewing-as');
  }
  // Not in the public typings, but it is how the client keeps its own token.
  const adminToken: string | null = (Accounts as any)._storedLoginToken();
  if (!adminToken) {
    throw new Error('not-logged-in');
  }
  const token = (await call('viewAsUser', memberId)) as string;
  s.setItem(TOKEN_KEY, adminToken);
  s.setItem(NAME_KEY, username);
  const e2ee = s.getItem(E2EE_KEY);
  if (e2ee) {
    s.setItem(E2EE_PARKED_KEY, e2ee);
    s.removeItem(E2EE_KEY);
  }
  await loginWithToken(token);
  getDefaultStore().set(viewAsAtom, username);
}

export async function stopViewAs() {
  const s = storage();
  const adminToken = s?.getItem(TOKEN_KEY);
  if (!s || !adminToken) {
    return;
  }
  // Logging out drops the borrowed token on the server.
  await logout();
  s.removeItem(TOKEN_KEY);
  s.removeItem(NAME_KEY);
  const e2ee = s.getItem(E2EE_PARKED_KEY);
  if (e2ee) {
    s.setItem(E2EE_KEY, e2ee);
    s.removeItem(E2EE_PARKED_KEY);
  }
  getDefaultStore().set(viewAsAtom, null);
  await loginWithToken(adminToken);
}

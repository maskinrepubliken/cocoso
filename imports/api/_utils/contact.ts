import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

import { emailIsValid } from './shared';

// Contact details: how the public reaches someone. The same shape is used
// on users (`publicContact`), resources, groups and activities (`contact`).
//
// Who must have them:
//   organizers (contributors and admins)  always
//   groups                                always
//   resources                             may
//   users who organize nothing            may
//   activities                            may, next to the organizers'
//
// "Having contact details" means an email address or a phone number; a
// website or a name alone is not a way to reach anyone.
export interface Contact {
  // A contact person or function, e.g. "Bokningen" or "Anna Lindqvist".
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export const ContactPattern = Match.Maybe(
  Match.OneOf(null, {
    name: Match.Maybe(String),
    email: Match.Maybe(String),
    phone: Match.Maybe(String),
    website: Match.Maybe(String),
  })
);

const trimmed = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

// A contact object with only the filled-in fields, or null when empty.
// Throws on an email that cannot be an address, so a typo does not end up
// on a public page.
export const cleanContact = (contact?: Contact | null): Contact | null => {
  if (!contact) {
    return null;
  }
  check(contact, ContactPattern);
  const name = trimmed(contact.name);
  const email = trimmed(contact.email);
  const phone = trimmed(contact.phone);
  let website = trimmed(contact.website);
  if (email && !emailIsValid(email)) {
    throw new Meteor.Error('invalid-email', 'The contact email is not valid');
  }
  if (website && !/^https?:\/\//i.test(website)) {
    website = `https://${website}`;
  }
  const cleaned: Contact = {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(website ? { website } : {}),
  };
  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

// Something to show at all.
export const hasContact = (contact?: Contact | null): boolean =>
  Boolean(
    contact && (contact.email || contact.phone || contact.website || contact.name)
  );

// Enough to reach someone: an email address or a phone number.
export const isReachable = (contact?: Contact | null): boolean =>
  Boolean(contact && (contact.email || contact.phone));

// cleanContact, then insist on an email or a phone number.
export const requireContact = (contact?: Contact | null): Contact => {
  const cleaned = cleanContact(contact);
  if (!cleaned || !isReachable(cleaned)) {
    throw new Meteor.Error(
      'contact-required',
      'An email address or a phone number is required'
    );
  }
  return cleaned;
};

export const telHref = (phone: string): string =>
  `tel:${phone.replace(/[^+\d]/g, '')}`;

export const websiteLabel = (url: string): string =>
  url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

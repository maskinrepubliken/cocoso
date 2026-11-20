import {
  emailButton,
  emailPage,
  emailSmallPrint,
  themeColors,
} from '../_utils/services/mails/emailDesign';

/**
 * The email to the new owner of an organizer profile that an admin made
 * as an alias and then turned into an account (convertAliasToAccount in
 * user.alias.js), in the site's email design (emailDesign.js). It says
 * what is waiting and how to log in: with this address, by code.
 */

const STRINGS = {
  sv: {
    subject: (name, site) => `${name} har ett arrangörskonto på ${site}`,
    title: 'Ditt arrangörskonto väntar',
    lead: (name, site) =>
      `En administratör på ${site} har lagt upp arrangörsprofilen ${name} och lämnar nu över den till dig.`,
    preheader: 'Logga in med den här e-postadressen för att ta över profilen.',
    button: 'Logga in',
    how: (email) =>
      `Du loggar in med ${email} – inget lösenord. Vi skickar en kod till adressen varje gång, och första gången får du godkänna användarvillkoren.`,
    keeps:
      'Profilen, dess sida och de evenemang som redan ligger uppe följer med. Du kan ändra dem när du har loggat in.',
    ignore:
      'Väntade du dig inte det här mejlet? Då kan du bortse från det — ingen kommer åt kontot utan en kod till den här adressen.',
  },
  en: {
    subject: (name, site) => `${name} has an organizer account on ${site}`,
    title: 'Your organizer account is waiting',
    lead: (name, site) =>
      `An administrator on ${site} has set up the organizer profile ${name} and is now handing it over to you.`,
    preheader: 'Log in with this email address to take over the profile.',
    button: 'Log in',
    how: (email) =>
      `You log in with ${email} – no password. We send a code to the address each time, and the first time you are asked to accept the terms.`,
    keeps:
      'The profile, its page and the events already published come along. You can change them once you have logged in.',
    ignore:
      "Weren't expecting this email? You can ignore it — nobody gets into the account without a code sent to this address.",
  },
};

export function inviteEmail({ lang, siteName, theme, name, email, url }) {
  const s = STRINGS[lang] || STRINGS.sv;
  const c = themeColors(theme);
  const html = emailPage({
    lang,
    siteName,
    theme,
    title: s.title,
    lead: s.lead(name, siteName),
    preheader: s.preheader,
    content: [
      emailButton({ href: url, label: s.button, c }),
      emailSmallPrint([s.how(email), s.keeps, s.ignore]),
    ].join('\n'),
  });
  const text = [
    s.lead(name, siteName),
    `${s.button}: ${url}`,
    s.how(email),
    s.keeps,
    s.ignore,
  ].join('\n\n');
  return { subject: s.subject(name, siteName), html, text };
}

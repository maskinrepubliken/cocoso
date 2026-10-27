import escapeHtml from '../_utils/escapeHtml';
import {
  DIGITS,
  LINJE,
  MYLLA,
  UI,
  emailButton,
  themeColors,
  emailPage,
  emailSmallPrint,
} from '../_utils/services/mails/emailDesign';

/**
 * The email with the login code, in the site's email design
 * (emailDesign.js): the code in six boxes, a button that logs in directly,
 * and for an address without an account a box that says plainly a new
 * account will be made.
 */

const STRINGS = {
  sv: {
    subject: (code, site) => `${code} är din inloggningskod till ${site}`,
    preheader: 'Koden gäller i 15 minuter.',
    title: 'Din inloggningskod',
    lead: (site) =>
      `Skriv in koden på ${site} för att logga in, eller använd knappen.`,
    button: 'Logga in',
    validity: 'Koden och knappen gäller i 15 minuter och fungerar en gång.',
    ignore:
      'Försökte du inte logga in? Då kan du bortse från det här mejlet — ingen kommer åt ditt konto utan koden.',
    text: (site, code, url) =>
      `Din inloggningskod till ${site}: ${code}\n\nEller logga in direkt: ${url}\n\nKoden och länken gäller i 15 minuter och fungerar en gång. Försökte du inte logga in? Då kan du bortse från det här mejlet.`,
    // An address without an account yet: the same code makes one
    signup: {
      subject: (code, site) =>
        `${code} är din kod för att skapa konto på ${site}`,
      // U+2011, a hyphen that never breaks: "e-" / "postadress" on phones
      title: 'Bekräfta din e‑postadress',
      lead: (site) =>
        `Skriv in koden på ${site} för att skapa ditt konto, eller använd knappen.`,
      button: 'Skapa konto',
      ignore:
        'Har du inte försökt skapa ett konto? Då kan du bortse från det här mejlet — inget konto skapas utan koden.',
      // The box that says plainly what is about to happen
      notice: {
        heading: 'Ett nytt konto skapas',
        intro: (email, site) =>
          `Det finns inget konto för ${email} på ${site} än. Om du fortsätter skapas ett.`,
        points: [
          'Ditt namn och bild syns bara om du själv fyller i dem.',
          'Innan du kan lägga upp egna evenemang måste en administratör godkänna dig som arrangör.',
          'Du kan ta bort kontot när du vill under din profil.',
        ],
        confirm:
          'Inget skapas förrän du har bekräftat kontot och godkänt användarvillkoren på sidan.',
      },
      text: (site, code, url, notice) =>
        `${notice}\n\nDin kod för att skapa konto på ${site}: ${code}\n\nEller skapa kontot direkt: ${url}\n\nKoden och länken gäller i 15 minuter och fungerar en gång. Har du inte försökt skapa ett konto? Då kan du bortse från det här mejlet.`,
    },
  },
  en: {
    subject: (code, site) => `${code} is your login code for ${site}`,
    preheader: 'The code is valid for 15 minutes.',
    title: 'Your login code',
    lead: (site) => `Enter the code on ${site} to log in, or use the button.`,
    button: 'Log in',
    validity: 'The code and the button are valid for 15 minutes and work once.',
    ignore:
      "Didn't try to log in? You can ignore this email — nobody gets into your account without the code.",
    text: (site, code, url) =>
      `Your login code for ${site}: ${code}\n\nOr log in directly: ${url}\n\nThe code and link are valid for 15 minutes and work once. Didn't try to log in? You can ignore this email.`,
    signup: {
      subject: (code, site) =>
        `${code} is your code to create an account on ${site}`,
      title: 'Confirm your email address',
      lead: (site) =>
        `Enter the code on ${site} to create your account, or use the button.`,
      button: 'Create account',
      ignore:
        "Didn't try to create an account? You can ignore this email — no account is made without the code.",
      notice: {
        heading: 'A new account will be created',
        intro: (email, site) =>
          `There is no account for ${email} on ${site} yet. If you go on, one will be created.`,
        points: [
          'Your name and picture only show if you add them yourself.',
          'Before you can post your own events, an administrator has to approve you as an organizer.',
          'You can delete the account whenever you like from your profile.',
        ],
        confirm:
          'Nothing is created until you have confirmed the account and accepted the terms on the site.',
      },
      text: (site, code, url, notice) =>
        `${notice}\n\nYour code to create an account on ${site}: ${code}\n\nOr create it directly: ${url}\n\nThe code and link are valid for 15 minutes and work once. Didn't try to create an account? You can ignore this email.`,
    },
  },
};

function codeBoxes(code, color) {
  const cells = String(code)
    .split('')
    .map(
      (digit) =>
        `<td align="center" valign="middle" width="44" height="54" style="width:44px;height:54px;background:#ffffff;border:1.5px solid ${LINJE};border-radius:10px;font-family:${DIGITS};font-size:28px;font-weight:700;font-variant-numeric:lining-nums tabular-nums;color:${color};line-height:54px;">${escapeHtml(
          digit
        )}</td>`
    )
    .join(
      '<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>'
    );
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;border-collapse:separate;"><tr>${cells}</tr></table>`;
}

// In the site's green, like the confirm screen's list — information, not
// a warning
function noticeBox(notice, email, siteName, c) {
  const points = notice.points
    .map(
      (point) =>
        `<tr><td valign="top" style="width:16px;padding:0 0 6px;font-family:${UI};font-size:15px;line-height:1.45;color:${
          c.button
        };">&bull;</td><td style="padding:0 0 6px;font-family:${UI};font-size:15px;line-height:1.45;color:${MYLLA};">${escapeHtml(
          point
        )}</td></tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
          <tr><td style="background:${c.tint};border-left:4px solid ${
    c.button
  };border-radius:10px;padding:16px 18px;text-align:left;">
            <p style="margin:0 0 6px;font-family:${UI};font-size:16px;font-weight:700;line-height:1.3;color:${
    c.strong
  };">${escapeHtml(notice.heading)}</p>
            <p style="margin:0 0 10px;font-family:${UI};font-size:15px;line-height:1.45;color:${MYLLA};">${escapeHtml(
    notice.intro(email, siteName)
  )}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">${points}</table>
            <p style="margin:6px 0 0;font-family:${UI};font-size:15px;font-weight:700;line-height:1.45;color:${MYLLA};">${escapeHtml(
    notice.confirm
  )}</p>
          </td></tr>
        </table>`;
}

const noticeText = (notice, email, siteName) =>
  [
    notice.heading.toUpperCase(),
    notice.intro(email, siteName),
    ...notice.points.map((point) => `- ${point}`),
    notice.confirm,
  ].join('\n');

// `isNew`: the address has no account yet. The mail says so plainly, and
// the code then leads to the confirm step (ConfirmSignup) before anything
// is created — see the emailLogin login handler.
export function loginEmail({ lang, siteName, theme, code, url, isNew, email }) {
  const base = STRINGS[lang] || STRINGS.sv;
  const s = isNew ? { ...base, ...base.signup } : base;
  const c = themeColors(theme);
  const html = emailPage({
    lang,
    siteName,
    theme,
    title: s.title,
    lead: s.lead(siteName),
    preheader: `${code} — ${s.preheader}`,
    content: [
      isNew && s.notice ? noticeBox(s.notice, email, siteName, c) : '',
      codeBoxes(code, MYLLA),
      emailButton({ href: url, label: s.button, c }),
      emailSmallPrint([s.validity, s.ignore]),
    ].join('\n'),
  });

  return {
    subject: s.subject(code, siteName),
    html,
    text: s.text(
      siteName,
      code,
      url,
      isNew && s.notice ? noticeText(s.notice, email, siteName) : ''
    ),
  };
}

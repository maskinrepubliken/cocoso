import { publicUrl } from '../_utils/shared';
import escapeHtml from '../_utils/escapeHtml';

/**
 * The email with the login code, in the look of the login page but plain
 * white like a transactional email: the site's name, an envelope, a
 * Fraunces title, the code in six boxes, a green pill button and the small
 * print under a hairline. No coloured background, no card, no footer.
 *
 * Email clients don't read CSS variables, so the materials are the hex
 * values from imports/ui/utils/globalStylesManager.ts, and the green comes
 * from the site's theme with the same formulas. The envelope is a PNG (Outlook
 * shows no WebP) in public/email/. Everything is inline styles and tables.
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
      text: (site, code, url) =>
        `Din kod för att skapa konto på ${site}: ${code}\n\nEller skapa kontot direkt: ${url}\n\nKoden och länken gäller i 15 minuter och fungerar en gång. Har du inte försökt skapa ett konto? Då kan du bortse från det här mejlet.`,
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
      text: (site, code, url) =>
        `Your code to create an account on ${site}: ${code}\n\nOr create it directly: ${url}\n\nThe code and link are valid for 15 minutes and work once. Didn't try to create an account? You can ignore this email.`,
    },
  },
};

// Same as getColor() in globalStylesManager.ts, as hex for email clients
function hsl(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n) =>
    Math.round(
      255 * (light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))
    )
      .toString(16)
      .padStart(2, '0');
  return `#${f(0)}${f(8)}${f(4)}`;
}

function themeColors(theme) {
  if (theme?.variant === 'gray') {
    return { tint: '#f0ebe6', button: '#58504b', strong: '#443c34' };
  }
  const hue = Number(theme?.hue) || 220;
  const saturation = Number(theme?.saturation) || 80;
  const accentHue = Number(theme?.accentHue) || hue;
  const accentSaturation = Number(theme?.accentSaturation) || saturation;
  return {
    tint: hsl(hue, saturation, 92), // theme-100
    button: hsl(accentHue, accentSaturation, 40), // theme-500
    strong: hsl(accentHue, accentSaturation, 20), // theme-700
  };
}

const MYLLA = '#22302a';
const MYLLA_SOFT = '#5c6b60';
const LINJE = '#d5dfc2';
const DISPLAY = "Fraunces, Georgia, 'Times New Roman', serif";
const UI = "Raleway, 'Helvetica Neue', Helvetica, Arial, sans-serif";
// Raleway's digits are old-style (4, 9 and 3 drop below the line) and not
// every client honours font-variant-numeric, so the code uses a plain sans.
const DIGITS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

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

// `isNew`: the address has no account yet, so the mail confirms it and the
// code creates the account (see findOrCreateUser in emailLogin.js).
export function loginEmail({ lang, siteName, theme, code, url, isNew }) {
  const base = STRINGS[lang] || STRINGS.sv;
  const s = isNew ? { ...base, ...base.signup } : base;
  const c = themeColors(theme);
  const name = escapeHtml(siteName);
  const site = publicUrl('/');
  const href = escapeHtml(url);

  const html = `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'sv'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(s.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Raleway:wght@400;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; }
  a { color:${c.strong}; }
  @media (max-width: 480px) {
    .sheet { padding:8px 20px 24px !important; }
    .title { font-size:26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-variant-numeric:lining-nums;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#ffffff;">${escapeHtml(
    `${code} — ${s.preheader}`
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  <tr><td align="center" style="padding:32px 12px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;">

      <tr><td align="center" style="padding:0 0 28px;">
        <a href="${escapeHtml(
          site
        )}" style="text-decoration:none;color:${MYLLA};">
          <span style="font-family:${UI};font-size:16px;font-weight:700;color:${MYLLA};">${name}</span>
        </a>
      </td></tr>

      <tr><td class="sheet" align="center" style="padding:8px 32px 0;">
        <img src="${escapeHtml(
          publicUrl('/email/mail.png')
        )}" width="64" height="52" alt="" style="display:block;border:0;width:64px;height:52px;margin:0 auto 18px;">
        <h1 class="title" style="margin:0 0 8px;font-family:${DISPLAY};font-size:30px;font-weight:600;line-height:1.15;letter-spacing:-0.01em;color:${MYLLA};">${escapeHtml(
    s.title
  )}</h1>
        <p style="margin:0 auto 24px;max-width:300px;font-family:${UI};font-size:16px;line-height:1.5;color:${MYLLA_SOFT};">${escapeHtml(
    s.lead(siteName)
  )}</p>

        ${codeBoxes(code, MYLLA)}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
          <tr><td align="center" bgcolor="${
            c.button
          }" style="border-radius:999px;background:${c.button};">
            <a href="${href}" style="display:block;padding:14px 24px;font-family:${UI};font-size:17px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(
    s.button
  )} &rarr;</a>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
          <tr><td style="border-top:1px solid ${LINJE};padding:18px 0 0;font-family:${UI};font-size:14px;line-height:1.5;color:${MYLLA_SOFT};text-align:center;">
            <p style="margin:0 0 8px;">${escapeHtml(s.validity)}</p>
            <p style="margin:0;">${escapeHtml(s.ignore)}</p>
          </td></tr>
        </table>
      </td></tr>


    </table>
  </td></tr>
</table>
</body>
</html>`;

  return {
    subject: s.subject(code, siteName),
    html,
    text: s.text(siteName, code, url),
  };
}

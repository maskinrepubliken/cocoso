import { publicUrl } from '../../shared';
import escapeHtml from '../../escapeHtml';

/**
 * The look every email from the site shares, matching the login page but
 * plain white like a transactional email: the site's name at the top, an
 * optional picture, a Fraunces title, the content, an optional green pill
 * button and small print under a hairline. No coloured background, no card,
 * no footer.
 *
 * Email clients don't read CSS variables, so the materials are the hex
 * values from imports/ui/utils/globalStylesManager.ts, and the green comes
 * from the site's theme with the same formulas. Pictures are PNGs in
 * public/email/ (Outlook shows no WebP). Everything is inline styles and
 * tables.
 */

export const MYLLA = '#22302a';
export const MYLLA_SOFT = '#5c6b60';
export const LINJE = '#d5dfc2';
export const DISPLAY = "Fraunces, Georgia, 'Times New Roman', serif";
export const UI = "Raleway, 'Helvetica Neue', Helvetica, Arial, sans-serif";
// Raleway's digits are old-style (4, 9 and 3 drop below the line) and not
// every client honours font-variant-numeric, so codes use a plain sans.
export const DIGITS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

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

export function themeColors(theme) {
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

// The green pill, full width
export function emailButton({ href, label, c }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
          <tr><td align="center" bgcolor="${
            c.button
          }" style="border-radius:999px;background:${c.button};">
            <a href="${escapeHtml(
              href
            )}" style="display:block;padding:14px 24px;font-family:${UI};font-size:17px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(
    label
  )} &rarr;</a>
          </td></tr>
        </table>`;
}

// Small print under a hairline; each line is plain text
export function emailSmallPrint(lines) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
          <tr><td style="border-top:1px solid ${LINJE};padding:18px 0 0;font-family:${UI};font-size:14px;line-height:1.5;color:${MYLLA_SOFT};text-align:center;">
            ${lines
              .map(
                (line, i) =>
                  `<p style="margin:0${
                    i < lines.length - 1 ? ' 0 8px' : ''
                  };">${escapeHtml(line)}</p>`
              )
              .join('\n            ')}
          </td></tr>
        </table>`;
}

/**
 * The whole document around `content` (already-safe HTML). `title` and
 * `lead` are plain text; `picture` is a file in public/email/ with its
 * display size; `preheader` is the hidden line inboxes show after the
 * subject.
 */
export function emailPage({
  lang,
  siteName,
  theme,
  title,
  lead,
  preheader,
  picture = { src: '/email/mail.png', width: 64, height: 52 },
  content,
}) {
  const c = themeColors(theme);
  const site = publicUrl('/');
  return `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'sv'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
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
    preheader || ''
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  <tr><td align="center" style="padding:32px 12px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;">

      <tr><td align="center" style="padding:0 0 28px;">
        <a href="${escapeHtml(
          site
        )}" style="text-decoration:none;color:${MYLLA};">
          <span style="font-family:${UI};font-size:16px;font-weight:700;color:${MYLLA};">${escapeHtml(
    siteName
  )}</span>
        </a>
      </td></tr>

      <tr><td class="sheet" align="center" style="padding:8px 32px 0;">
        ${
          picture
            ? `<img src="${escapeHtml(publicUrl(picture.src))}" width="${
                picture.width
              }" height="${
                picture.height
              }" alt="" style="display:block;border:0;width:${
                picture.width
              }px;height:${picture.height}px;margin:0 auto 18px;">`
            : ''
        }
        <h1 class="title" style="margin:0 0 8px;font-family:${DISPLAY};font-size:30px;font-weight:600;line-height:1.15;letter-spacing:-0.01em;color:${MYLLA};">${escapeHtml(
    title
  )}</h1>
        ${
          lead
            ? `<p style="margin:0 auto 24px;max-width:300px;font-family:${UI};font-size:16px;line-height:1.5;color:${MYLLA_SOFT};">${escapeHtml(
                lead
              )}</p>`
            : ''
        }
        ${content}
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

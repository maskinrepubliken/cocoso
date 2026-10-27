import DOMPurify from 'isomorphic-dompurify';

import { publicUrl } from '../../shared';
import escapeHtml from '../../escapeHtml';
import {
  MYLLA,
  UI,
  emailButton,
  emailPage,
  emailSmallPrint,
  themeColors,
} from './emailDesign';

/**
 * The emails sent when an admin changes someone's role — verified as an
 * organizer (contributor) or made admin — in the site's email design. The
 * subject (also the title), the greeting and the body are the site's own
 * texts from Admin → E-post (site.emails[1] and [2]); the picture, button
 * and small print are fixed here.
 */

const ROLES = {
  contributor: {
    picture: { src: '/email/medal.png', width: 41, height: 56 },
    button: 'Lägg upp ett evenemang',
    path: '/activities?new=true',
  },
  admin: {
    picture: { src: '/email/crown.png', width: 56, height: 56 },
    button: 'Till administrationen',
    path: '/admin',
  },
};

const PARAGRAPH = `margin:0 0 14px;font-family:${UI};font-size:16px;line-height:1.55;color:${MYLLA};text-align:left;`;

// The body is either plain text from the defaults (lines become paragraphs)
// or HTML from the admin's rich-text editor (cleaned, paragraphs styled).
function bodyHtml(body) {
  const text = String(body || '').trim();
  if (!text) {
    return '';
  }
  if (/<[a-z][\s\S]*>/i.test(text)) {
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'a',
        'ul',
        'ol',
        'li',
      ],
      ALLOWED_ATTR: ['href'],
    });
    return clean
      .replace(/<p>/g, `<p style="${PARAGRAPH}">`)
      .replace(/<(ul|ol)>/g, `<$1 style="${PARAGRAPH}padding-left:20px;">`);
  }
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="${PARAGRAPH}">${escapeHtml(line)}</p>`)
    .join('\n');
}

const bodyText = (body) =>
  String(body || '')
    .replace(/<\/p>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * `template`: { subject, appeal, body } from site.emails; `name`: the
 * person's first name, else their username.
 */
export function roleEmail({ role, template, name, siteName, theme }) {
  const r = ROLES[role];
  const c = themeColors(theme);
  const subject = template?.subject || '';
  const greeting = `${template?.appeal || 'Hej'} ${name},`;
  const url = publicUrl(r.path);
  const smallPrint = `Du får det här mejlet eftersom en administratör har ändrat din roll på ${siteName}.`;

  const html = emailPage({
    siteName,
    theme,
    title: subject,
    preheader: bodyText(template?.body).split('\n')[0],
    picture: r.picture,
    content: [
      `<p style="${PARAGRAPH}margin-top:12px;">${escapeHtml(greeting)}</p>`,
      bodyHtml(template?.body),
      emailButton({ href: url, label: r.button, c }),
      emailSmallPrint([smallPrint]),
    ].join('\n'),
  });

  const text = [
    greeting,
    bodyText(template?.body),
    `${r.button}: ${url}`,
    smallPrint,
  ].join('\n\n');

  return { subject, html, text };
}

import escapeHtml from '../_utils/escapeHtml';
import { publicUrl } from '../_utils/shared';
import {
  MYLLA,
  MYLLA_SOFT,
  UI,
  emailPage,
  emailSmallPrint,
} from '../_utils/services/mails/emailDesign';

export const FEEDBACK_SUBJECTS = {
  suggestion: { label: 'Förslag', picture: '/email/mail.png' },
  bug: { label: 'Något är fel', picture: '/email/mail.png' },
  compliment: { label: 'Beröm', picture: '/email/medal.png' },
} as const;

export type FeedbackSubject = keyof typeof FEEDBACK_SUBJECTS;

const PARAGRAPH = `margin:0 0 14px;font-family:${UI};font-size:16px;line-height:1.55;color:${MYLLA};text-align:left;`;
const META = `margin:0 0 4px;font-family:${UI};font-size:14px;line-height:1.5;color:${MYLLA_SOFT};text-align:left;`;

/**
 * The email the admins get when a visitor sends "Ge feedback": the kind,
 * the message as the visitor wrote it, and who and where it came from.
 * Everything the visitor typed is escaped.
 */
export function feedbackEmail({
  subject,
  message,
  email,
  username,
  page,
  siteName,
  theme,
}: {
  subject: FeedbackSubject;
  message: string;
  email?: string;
  username?: string;
  page?: string;
  siteName: string;
  theme?: unknown;
}) {
  const kind = FEEDBACK_SUBJECTS[subject];
  const from =
    [username, email].filter(Boolean).join(', ') || 'en anonym besökare';
  const pageUrl = page ? publicUrl(page) : null;
  const title = `Feedback: ${kind.label}`;

  const paragraphs = message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="${PARAGRAPH}">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
    )
    .join('\n');

  const meta = [
    `<p style="${META}margin-top:20px;"><strong>Från:</strong> ${escapeHtml(
      from
    )}</p>`,
    pageUrl
      ? `<p style="${META}"><strong>Skickat från:</strong> <a href="${escapeHtml(
          pageUrl
        )}">${escapeHtml(page || '')}</a></p>`
      : '',
  ].join('\n');

  const smallPrint = email
    ? `Svara på det här mejlet för att svara ${email} direkt.`
    : 'Besökaren lämnade ingen e-postadress, så det går inte att svara.';

  const html = emailPage({
    lang: 'sv',
    siteName,
    theme,
    title,
    lead: `Från ${from}`,
    preheader: message.slice(0, 120),
    picture: { src: kind.picture, width: 56, height: 56 },
    content: [
      paragraphs,
      meta,
      emailSmallPrint([
        smallPrint,
        `Du får det här mejlet eftersom du är administratör på ${siteName}.`,
      ]),
    ].join('\n'),
  });

  const text = [
    title,
    `Från: ${from}`,
    pageUrl ? `Skickat från: ${pageUrl}` : '',
    message,
    smallPrint,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { subject: `${title} – ${siteName}`, html, text };
}

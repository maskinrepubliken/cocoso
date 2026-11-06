import escapeHtml from '../_utils/escapeHtml';
import { publicUrl } from '../_utils/shared';
import { formatAddress } from '../_utils/address';
import { activityShareImageUrl } from '../share/shareImage';
import {
  MYLLA,
  MYLLA_SOFT,
  UI,
  emailButton,
  emailEventPage,
  themeColors,
} from '../_utils/services/mails/emailDesign';

/**
 * The emails about one event: signing up, changing or cancelling a
 * registration, and the updates sent to everyone signed up or following
 * (a message from the organizer, a new time or place). They share one
 * layout (emailEventPage): the event's share image on top as its picture
 * and identity, a kicker saying what happened, the event's title, the
 * little that is new, a button to the event and one line of small print.
 * Each returns { subject, html, text }.
 */

const STRINGS = {
  sv: {
    locale: 'sv-SE',
    when: 'När',
    where: 'Var',
    who: 'Anmälda',
    button: 'Visa evenemanget',
    register: {
      subject: (title) => `Du är anmäld: ${title}`,
      kicker: 'Du är anmäld!',
    },
    update: {
      subject: (title) => `Din anmälan är ändrad: ${title}`,
      kicker: 'Din anmälan är ändrad',
    },
    change: 'Ändra eller avanmäl dig',
    cancel: {
      subject: (title) => `Du är avanmäld: ${title}`,
      kicker: 'Du är avanmäld',
      again:
        'Ångrar du dig? Anmäl dig igen på evenemangets sida, så länge det finns platser kvar.',
    },
    plus: (n) => ` + ${n} ${n === 1 ? 'person' : 'personer'}`,
    updates: {
      message: {
        subject: (title) => `Nytt om ${title}`,
        kicker: 'Nytt från arrangören',
      },
      changed: {
        subject: (title) => `Ändrat: ${title}`,
        kicker: { time: 'Ny tid', place: 'Ny plats', both: 'Ny tid och plats' },
      },
      stop: 'Sluta få uppdateringar om evenemanget',
    },
  },
  en: {
    locale: 'en-GB',
    when: 'When',
    where: 'Where',
    who: 'Registered',
    button: 'View the event',
    register: {
      subject: (title) => `You're signed up: ${title}`,
      kicker: "You're signed up!",
    },
    update: {
      subject: (title) => `Your registration has changed: ${title}`,
      kicker: 'Your registration has changed',
    },
    change: 'Change or cancel your sign-up',
    cancel: {
      subject: (title) => `Your sign-up is cancelled: ${title}`,
      kicker: 'Your sign-up is cancelled',
      again:
        'Changed your mind? Sign up again on the event page, as long as there are places left.',
    },
    plus: (n) => ` + ${n} ${n === 1 ? 'person' : 'people'}`,
    updates: {
      message: {
        subject: (title) => `News about ${title}`,
        kicker: 'News from the organizer',
      },
      changed: {
        subject: (title) => `Changed: ${title}`,
        kicker: {
          time: 'New time',
          place: 'New place',
          both: 'New time and place',
        },
      },
      stop: 'Stop updates about this event',
    },
  },
};

const stringsFor = (site, lang) =>
  STRINGS[lang] || STRINGS[site?.settings?.lang] || STRINGS.sv;

// "tisdag 10 november, 14:00–16:00"; the year only when it isn't this one;
// across days, both ends in full
function formatOccurrence(occurrence, locale) {
  if (!occurrence?.startDate) {
    return '';
  }
  const thisYear = String(new Date().getFullYear());
  const day = (date) =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(date.startsWith(thisYear) ? {} : { year: 'numeric' }),
    }).format(new Date(`${date}T12:00:00`));
  const { startDate, startTime, endDate, endTime } = occurrence;
  if (endDate && endDate !== startDate) {
    return `${day(startDate)} ${startTime || ''} – ${day(endDate)} ${
      endTime || ''
    }`.trim();
  }
  // Word joiners keep "14:00–16:00" on one line
  const times = [startTime, endTime].filter(Boolean).join('⁠–⁠');
  return times ? `${day(startDate)}, ${times}` : day(startDate);
}

// The coming dates, at most three
function comingDates(activity, s) {
  const today = new Date().toISOString().slice(0, 10);
  const all = activity.datesAndTimes || [];
  const coming = all.filter(
    (date) => (date.endDate || date.startDate) >= today
  );
  return (coming.length > 0 ? coming : all)
    .slice(0, 3)
    .map((date) => formatOccurrence(date, s.locale));
}

const placeOf = (activity) =>
  [
    activity.resource || activity.place || '',
    formatAddress(activity.placeAddress),
  ]
    .filter(Boolean)
    .join(', ');

// The share image (title, date and place drawn in, so it carries the
// event's look); the event's own picture once it has no dates left
function heroOf(activity, dates) {
  const src = activityShareImageUrl(activity) || activity.images?.[0];
  if (!src) {
    return null;
  }
  return {
    src,
    href: publicUrl(`/activities/${activity._id}`),
    alt: [activity.title, dates[0], activity.resource || activity.place]
      .filter(Boolean)
      .join(' – '),
  };
}

// Label and value pairs; values are plain text, one line each
function facts(rows) {
  const shown = rows.filter(([, lines]) => lines?.length);
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;">${shown
    .map(
      ([label, lines]) => `<tr>
            <td valign="top" style="width:84px;padding:4px 12px 4px 0;font-family:${UI};font-size:14px;line-height:1.5;color:${MYLLA_SOFT};">${escapeHtml(
        label
      )}</td>
            <td valign="top" style="padding:4px 0;font-family:${UI};font-size:15px;font-weight:700;line-height:1.5;color:${MYLLA};">${lines
        .map((line) => escapeHtml(line))
        .join('<br>')}</td>
          </tr>`
    )
    .join('')}</table>`;
  const text = shown
    .map(([label, lines]) => `${label}: ${lines.join('; ')}`)
    .join('\n');
  return { html, text };
}

const paragraph = (text) =>
  `<p style="margin:0;font-family:${UI};font-size:15px;line-height:1.55;color:${MYLLA_SOFT};">${escapeHtml(
    text
  )}</p>`;

const link = (href, label, c) =>
  `<a href="${escapeHtml(href)}" style="color:${c.strong};">${escapeHtml(
    label
  )}</a>`;

function registrationFacts(activity, values, occurrence, s, withPeople) {
  const name = [values?.firstName, values?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const people = Number(values?.numberOfPeople) || 1;
  const who = `${name || values?.email || ''}${
    people > 1 ? s.plus(people - 1) : ''
  }`;
  return facts([
    [s.when, [formatOccurrence(occurrence, s.locale)].filter(Boolean)],
    [s.where, [placeOf(activity)].filter(Boolean)],
    [s.who, withPeople && who ? [who] : []],
  ]);
}

/**
 * A new or changed registration. `values`: what they registered with
 * (firstName, lastName, email, numberOfPeople); `occurrence`: the date.
 */
export function registrationEmail({
  activity,
  values,
  occurrence,
  site,
  currentUser,
  isUpdate = false,
}) {
  const s = stringsFor(site, currentUser?.lang);
  const kind = isUpdate ? s.update : s.register;
  const url = publicUrl(`/activities/${activity._id}`);
  const c = themeColors(site?.theme);
  const when = formatOccurrence(occurrence, s.locale);
  const rows = registrationFacts(activity, values, occurrence, s, true);

  const html = emailEventPage({
    lang: currentUser?.lang,
    siteName: site?.settings?.name || '',
    theme: site?.theme,
    preheader: when,
    hero: heroOf(activity, [when]),
    status: kind.kicker,
    title: activity.title,
    content: [rows.html, emailButton({ href: url, label: s.button, c })].join(
      '\n'
    ),
    footer: link(url, s.change, c),
  });

  return {
    subject: kind.subject(activity.title),
    html,
    text: [
      `${kind.kicker}: ${activity.title}`,
      rows.text,
      `${s.button}: ${url}`,
      `${s.change}: ${url}`,
    ].join('\n\n'),
  };
}

// A cancelled registration
export function unregistrationEmail({
  activity,
  values,
  occurrence,
  site,
  currentUser,
}) {
  const s = stringsFor(site, currentUser?.lang);
  const url = publicUrl(`/activities/${activity._id}`);
  const c = themeColors(site?.theme);
  const when = formatOccurrence(occurrence, s.locale);
  const rows = registrationFacts(activity, values, occurrence, s, false);

  const html = emailEventPage({
    lang: currentUser?.lang,
    siteName: site?.settings?.name || '',
    theme: site?.theme,
    preheader: `${s.cancel.kicker}: ${activity.title}`,
    hero: heroOf(activity, [when]),
    status: s.cancel.kicker,
    title: activity.title,
    content: [
      rows.html,
      `<div style="height:16px;line-height:16px;">&nbsp;</div>`,
      paragraph(s.cancel.again),
      emailButton({ href: url, label: s.button, c }),
    ].join('\n'),
  });

  return {
    subject: s.cancel.subject(activity.title),
    html,
    text: [
      `${s.cancel.kicker}: ${activity.title}`,
      rows.text,
      s.cancel.again,
      `${s.button}: ${url}`,
    ].join('\n\n'),
  };
}

/**
 * An update about an event, to everyone signed up for or following it:
 * a message from its organizer (`kind: 'message'`) or, after the organizer
 * changed its time or place, what it is now (`kind: 'changed'`; `changes`
 * holds 'time' and/or 'place'). `lang` is the reader's language, `stopUrl`
 * the signed link that ends updates about this event for them.
 */
export function activityUpdateEmail({
  activity,
  site,
  lang,
  kind,
  message,
  changes = [],
  stopUrl,
}) {
  const s = stringsFor(site, lang);
  const u = s.updates;
  const url = publicUrl(`/activities/${activity._id}`);
  const c = themeColors(site?.theme);
  const dates = comingDates(activity, s);
  const place = placeOf(activity);

  let kicker = u.message.kicker;
  let subject = u.message.subject(activity.title);
  let body = '';
  let bodyText = '';
  if (kind === 'changed') {
    const what =
      changes.includes('time') && changes.includes('place')
        ? 'both'
        : changes.includes('place')
        ? 'place'
        : 'time';
    kicker = u.changed.kicker[what];
    subject = u.changed.subject(activity.title);
    // What is new, on a tint, with the rest as it was
    const rows = facts([
      [s.when, dates],
      [s.where, [place].filter(Boolean)],
    ]);
    body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
          <tr><td style="padding:14px 18px;background:${c.tint};border-radius:12px;">${rows.html}</td></tr>
        </table>`;
    bodyText = rows.text;
  } else {
    const meta = [dates[0], activity.resource || activity.place]
      .filter(Boolean)
      .join(' · ');
    body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
          <tr><td style="padding:2px 0 2px 16px;border-left:3px solid ${
            c.button
          };font-family:${UI};font-size:20px;line-height:1.5;color:${MYLLA};white-space:pre-line;">${escapeHtml(
      message || ''
    )}</td></tr>
        </table>
        ${
          meta
            ? `<p style="margin:16px 0 0;font-family:${UI};font-size:14px;line-height:1.5;color:${MYLLA_SOFT};">${escapeHtml(
                meta
              )}</p>`
            : ''
        }`;
    bodyText = [message, meta].filter(Boolean).join('\n\n');
  }

  const html = emailEventPage({
    lang,
    siteName: site?.settings?.name || '',
    theme: site?.theme,
    preheader: message ? message.slice(0, 120) : dates[0] || '',
    hero: heroOf(activity, dates),
    // A new time or place is the news; a message's news is the message
    ...(kind === 'changed' ? { status: kicker } : { kicker }),
    title: activity.title,
    content: [body, emailButton({ href: url, label: s.button, c })].join('\n'),
    footer: stopUrl ? link(stopUrl, u.stop, c) : '',
  });

  return {
    subject,
    html,
    text: [
      `${kicker}: ${activity.title}`,
      bodyText,
      `${s.button}: ${url}`,
      stopUrl ? `${u.stop}: ${stopUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}

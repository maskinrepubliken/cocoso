import escapeHtml from '../_utils/escapeHtml';
import { publicUrl } from '../_utils/shared';
import { formatAddress } from '../_utils/address';
import {
  LINJE,
  MYLLA,
  MYLLA_SOFT,
  UI,
  emailButton,
  emailPage,
  emailSmallPrint,
  themeColors,
} from '../_utils/services/mails/emailDesign';

/**
 * The emails someone gets when they sign up for an event, change their
 * registration or cancel it — in the site's email design (emailDesign.js):
 * what they signed up for, when and where, the event's picture and a button
 * to its page. Each returns { subject, html, text }.
 */

const STRINGS = {
  sv: {
    locale: 'sv-SE',
    when: 'När',
    where: 'Var',
    who: 'Anmälda',
    event: 'Evenemang',
    button: 'Visa evenemanget',
    greeting: (name) => (name ? `Hej ${name}!` : 'Hej!'),
    register: {
      subject: (title) => `Du är anmäld: ${title}`,
      title: 'Du är anmäld!',
      lead: (title) => `Välkommen till ${title}. Här är din anmälan.`,
    },
    update: {
      subject: (title) => `Din anmälan är ändrad: ${title}`,
      title: 'Din anmälan är ändrad',
      lead: (title) => `Så här ser din anmälan till ${title} ut nu.`,
    },
    change:
      'Vill du ändra något eller avanmäla dig? Öppna evenemanget, välj tillfället och klicka på ”Ändra eller avanmäl dig”.',
    cancel: {
      subject: (title) => `Du är avanmäld: ${title}`,
      title: 'Du är avanmäld',
      lead: (title) => `Du är inte längre anmäld till ${title}.`,
      again:
        'Ångrar du dig? Du kan anmäla dig igen på evenemangets sida, så länge det finns platser kvar.',
    },
    plus: (n) => ` + ${n} ${n === 1 ? 'person' : 'personer'}`,
    updates: {
      message: {
        subject: (title) => `Nytt om ${title}`,
        title: 'Nytt från arrangören',
        lead: (title) => `Arrangören av ${title} har skickat ett meddelande.`,
      },
      changed: {
        subject: (title) => `Ändrat: ${title}`,
        title: 'Evenemanget är ändrat',
        lead: (title, what) => `${what} för ${title} är ändrad.`,
      },
      what: { time: 'Tiden', place: 'Platsen', both: 'Tiden och platsen' },
      why: (title) =>
        `Du får det här eftersom du är anmäld till eller följer ${title}.`,
      stop: 'Vill du inte få fler uppdateringar om evenemanget?',
      stopLink: 'Sluta få uppdateringar',
    },
  },
  en: {
    locale: 'en-GB',
    when: 'When',
    where: 'Where',
    who: 'Registered',
    event: 'Event',
    button: 'View the event',
    greeting: (name) => (name ? `Hi ${name}!` : 'Hi!'),
    register: {
      subject: (title) => `You're signed up: ${title}`,
      title: "You're signed up!",
      lead: (title) => `Welcome to ${title}. Here is your registration.`,
    },
    update: {
      subject: (title) => `Your registration has changed: ${title}`,
      title: 'Your registration has changed',
      lead: (title) => `This is your registration for ${title} now.`,
    },
    change:
      'Want to change or cancel? Open the event, choose the date and click “Change or cancel your sign-up”.',
    cancel: {
      subject: (title) => `Your sign-up is cancelled: ${title}`,
      title: 'Your sign-up is cancelled',
      lead: (title) => `You are no longer signed up for ${title}.`,
      again:
        'Changed your mind? You can sign up again on the event page, as long as there are places left.',
    },
    plus: (n) => ` + ${n} ${n === 1 ? 'person' : 'people'}`,
    updates: {
      message: {
        subject: (title) => `News about ${title}`,
        title: 'News from the organizer',
        lead: (title) => `The organizer of ${title} has sent a message.`,
      },
      changed: {
        subject: (title) => `Changed: ${title}`,
        title: 'The event has changed',
        lead: (title, what) => `${what} of ${title} has changed.`,
      },
      what: {
        time: 'The time',
        place: 'The place',
        both: 'The time and place',
      },
      why: (title) =>
        `You get this because you are signed up for or follow ${title}.`,
      stop: 'Rather not hear more about this event?',
      stopLink: 'Stop updates',
    },
  },
};

const stringsFor = (site, currentUser) =>
  STRINGS[currentUser?.lang] || STRINGS[site?.settings?.lang] || STRINGS.sv;

// "tisdag 29 september 2026, 14:00–16:00"; across days, both ends in full
function formatOccurrence(occurrence, locale) {
  if (!occurrence?.startDate) {
    return '';
  }
  const day = (date) =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  const { startDate, startTime, endDate, endTime } = occurrence;
  if (endDate && endDate !== startDate) {
    return `${day(startDate)} ${startTime || ''} – ${day(endDate)} ${
      endTime || ''
    }`.trim();
  }
  // Word joiners keep "14:00–16:00" on one line
  const times = [startTime, endTime].filter(Boolean).join('\u2060–\u2060');
  return times ? `${day(startDate)}, ${times}` : day(startDate);
}

function details(rows) {
  const cells = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr>
            <td valign="top" style="width:96px;padding:6px 12px 6px 0;font-family:${UI};font-size:14px;line-height:1.45;color:${MYLLA_SOFT};">${escapeHtml(
          label
        )}</td>
            <td valign="top" style="padding:6px 0;font-family:${UI};font-size:15px;font-weight:700;line-height:1.45;color:${MYLLA};">${value}</td>
          </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;border-top:1px solid ${LINJE};border-bottom:1px solid ${LINJE};text-align:left;">
          <tr><td style="padding:10px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cells}</table></td></tr>
        </table>`;
}

const picture = (src) =>
  src
    ? `<img src="${escapeHtml(
        src
      )}" width="376" alt="" style="display:block;border:0;width:100%;max-width:376px;height:auto;border-radius:12px;margin:0 0 20px;">`
    : '';

const unescape = (value) =>
  String(value)
    .replace(/<br>/g, ', ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

function eventFacts(activity, values, occurrence, s, withPeople) {
  const placeName = activity.resource || activity.place || '';
  const address = formatAddress(activity.placeAddress);
  const where = [placeName, address]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br>');
  const name = [values?.firstName, values?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const people = Number(values?.numberOfPeople) || 1;
  const who = withPeople
    ? escapeHtml(
        `${name || values?.email || ''}${people > 1 ? s.plus(people - 1) : ''}`
      )
    : '';
  const rows = [
    [s.event, escapeHtml(activity.title)],
    [s.when, escapeHtml(formatOccurrence(occurrence, s.locale))],
    [s.where, where],
    [s.who, who],
  ];
  const text = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${unescape(value)}`)
    .join('\n');
  return { html: details(rows), text };
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
  const s = stringsFor(site, currentUser);
  const kind = isUpdate ? s.update : s.register;
  const url = publicUrl(`/activities/${activity._id}`);
  const lead = `${s.greeting(values?.firstName)} ${kind.lead(activity.title)}`;
  const facts = eventFacts(activity, values, occurrence, s, true);

  const html = emailPage({
    siteName: site?.settings?.name || '',
    theme: site?.theme,
    title: kind.title,
    lead,
    preheader: formatOccurrence(occurrence, s.locale),
    picture: null,
    content: [
      picture(activity.images?.[0]),
      facts.html,
      emailButton({ href: url, label: s.button, c: themeColors(site?.theme) }),
      emailSmallPrint([s.change]),
    ].join('\n'),
  });

  return {
    subject: kind.subject(activity.title),
    html,
    text: [lead, facts.text, `${s.button}: ${url}`, s.change].join('\n\n'),
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
  const s = stringsFor(site, currentUser);
  const url = publicUrl(`/activities/${activity._id}`);
  const lead = `${s.greeting(values?.firstName)} ${s.cancel.lead(
    activity.title
  )}`;
  const facts = eventFacts(activity, values, occurrence, s, false);

  const html = emailPage({
    siteName: site?.settings?.name || '',
    theme: site?.theme,
    title: s.cancel.title,
    lead,
    preheader: s.cancel.lead(activity.title),
    picture: null,
    content: [
      facts.html,
      emailButton({ href: url, label: s.button, c: themeColors(site?.theme) }),
      emailSmallPrint([s.cancel.again]),
    ].join('\n'),
  });

  return {
    subject: s.cancel.subject(activity.title),
    html,
    text: [lead, facts.text, `${s.button}: ${url}`, s.cancel.again].join(
      '\n\n'
    ),
  };
}

// The coming dates, at most three, each on its own line
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
  const s = STRINGS[lang] || STRINGS[site?.settings?.lang] || STRINGS.sv;
  const u = s.updates;
  const texts = kind === 'changed' ? u.changed : u.message;
  const what =
    changes.includes('time') && changes.includes('place')
      ? u.what.both
      : u.what[changes.includes('place') ? 'place' : 'time'];
  const lead = texts.lead(activity.title, what);
  const url = publicUrl(`/activities/${activity._id}`);
  const c = themeColors(site?.theme);

  const where = [
    activity.resource || activity.place || '',
    formatAddress(activity.placeAddress),
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br>');
  const dates = comingDates(activity, s);
  const rows = [
    [s.event, escapeHtml(activity.title)],
    [s.when, dates.map((date) => escapeHtml(date)).join('<br>')],
    [s.where, where],
  ];
  const factsText = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${unescape(value)}`)
    .join('\n');

  const messageHtml = message
    ? `<p style="margin:0 0 20px;font-family:${UI};font-size:16px;line-height:1.55;color:${MYLLA};text-align:left;white-space:pre-line;">${escapeHtml(
        message
      )}</p>`
    : '';
  const stop = stopUrl
    ? `<p style="margin:12px 0 0;font-family:${UI};font-size:13px;line-height:1.5;color:${MYLLA_SOFT};text-align:center;">${escapeHtml(
        u.stop
      )} <a href="${escapeHtml(stopUrl)}" style="color:${
        c.strong
      };">${escapeHtml(u.stopLink)}</a></p>`
    : '';

  const html = emailPage({
    lang,
    siteName: site?.settings?.name || '',
    theme: site?.theme,
    title: texts.title,
    lead,
    preheader: message ? message.slice(0, 120) : dates[0] || '',
    picture: null,
    content: [
      messageHtml,
      picture(activity.images?.[0]),
      details(rows),
      emailButton({ href: url, label: s.button, c }),
      emailSmallPrint([u.why(activity.title)]),
      stop,
    ].join('\n'),
  });

  return {
    subject: texts.subject(activity.title),
    html,
    text: [
      lead,
      message,
      factsText,
      `${s.button}: ${url}`,
      u.why(activity.title),
      stopUrl ? `${u.stopLink}: ${stopUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}

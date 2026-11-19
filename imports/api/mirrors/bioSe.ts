import escapeHtml from '../_utils/escapeHtml';
import { getJson, type SourceEvent } from './axiell';
import type { MirrorDoc } from './mirror';

/**
 * Reading bio.se, the ticket site of Sweden's independent cinemas. Its own
 * pages ask these questions from the browser, without a key:
 *
 *   GET  https://www.bio.se/api/cinemas          every cinema
 *   POST https://www.bio.se/api/cinemas/films    { cinemaId } → the films
 *        still to be shown there, each with its screenings
 *
 * The API is not a documented one and may change without notice; a mirror
 * that can no longer read it fails and removes nothing.
 *
 * One screening becomes one event. Server only.
 */

const SITE = 'https://www.bio.se';
const ZONE = 'Europe/Stockholm';
const CINEMAS_KEPT_MS = 60 * 60 * 1000;
// When the film's length is not given
const DEFAULT_MINUTES = 120;

export interface BioSeCinema {
  id: number;
  slug: string;
  name: string;
  city: string;
  // The cinema's own site, as bio.se has it
  websiteUrl: string;
}

let cinemasKept: { at: number; cinemas: BioSeCinema[] } | null = null;

// Every cinema at bio.se, for the admin's choice. The answer is large and
// seldom changes, so it is kept for an hour.
export async function fetchBioSeCinemas(): Promise<BioSeCinema[]> {
  if (cinemasKept && Date.now() - cinemasKept.at < CINEMAS_KEPT_MS) {
    return cinemasKept.cinemas;
  }
  const answer = await getJson(`${SITE}/api/cinemas`);
  const cinemas: BioSeCinema[] = (
    Array.isArray(answer?.cinemas) ? answer.cinemas : []
  )
    .filter((c: any) => Number(c?.id) && c?.slug && c?.title)
    .map((c: any) => ({
      id: Number(c.id),
      slug: String(c.slug),
      name: String(c.title).trim(),
      city: String(c.city || '').trim(),
      websiteUrl: /^https?:\/\/\S+$/.test(String(c.website_url || '').trim())
        ? String(c.website_url).trim()
        : '',
    }))
    .sort((a: BioSeCinema, b: BioSeCinema) =>
      a.name.localeCompare(b.name, 'sv')
    );
  if (cinemas.length === 0) {
    throw new Error('bio.se listed no cinemas');
  }
  cinemasKept = { at: Date.now(), cinemas };
  return cinemas;
}

const zoneParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

// How far ahead of UTC Sweden's clocks are at the moment
function offsetAt(when: Date) {
  const part = (type: string) =>
    Number(zoneParts.formatToParts(when).find((p) => p.type === type)?.value);
  return (
    Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second')
    ) - when.getTime()
  );
}

// "2026-11-22T18:30:00", a Swedish clock time without its zone → the moment
export function swedishTime(local: string): Date | null {
  const asUtc = Date.parse(`${local}Z`);
  if (Number.isNaN(asUtc)) {
    return null;
  }
  const near = asUtc - offsetAt(new Date(asUtc));
  return new Date(asUtc - offsetAt(new Date(near)));
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

// bio.se's titles come with "&amp;" and the like
const plain = (text: unknown) =>
  String(text || '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
      if (name[0] === '#') {
        const code =
          name[1].toLowerCase() === 'x'
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return ENTITIES[name.toLowerCase()] ?? whole;
    })
    .trim();

// As bio.se makes the title part of a film's address
const slugOf = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const given = (value: unknown, not: string[] = []) => {
  const text = plain(value);
  return text && !not.includes(text.toLowerCase()) ? text : '';
};

// The film's text and a line of facts about the film and the screening
function describeScreening(movie: any, session: any) {
  // Mostly plain text, now and then with line breaks as tags
  const paragraphs = plain(
    String(movie.synopsis || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`);
  const minutes = Number(movie.run_time);
  const language = given(session.language || movie.language, ['unknown']);
  const subtitles = given(session.text || movie.text, ['unknown']);
  const facts = [
    given(movie.rating, ['ej angivet', 'unknown']),
    given(movie.genre, ['unknown']).split(',').join(', '),
    language && `Tal: ${language}`,
    subtitles && `Text: ${subtitles}`,
    minutes > 0 && `${minutes} min`,
    given(session.screen_name),
  ].filter(Boolean) as string[];
  return [
    ...paragraphs,
    facts.length ? `<p>${escapeHtml(facts.join(' · '))}</p>` : '',
  ].join('\n');
}

// Every screening still to come at the mirror's cinema
export async function fetchBioSeEvents(
  mirror: MirrorDoc
): Promise<SourceEvent[]> {
  if (!mirror.cinemaId || !mirror.cinemaSlug) {
    throw new Error('The mirror has no cinema');
  }
  const answer = await getJson(`${SITE}/api/cinemas/films`, {
    cinemaId: mirror.cinemaId,
  });
  if (!Array.isArray(answer?.movies)) {
    throw new Error('bio.se answered without a list of films');
  }
  const events: SourceEvent[] = [];
  const seen = new Set<string>();
  answer.movies.forEach((entry: any) => {
    const movie = entry?.movie;
    const title = plain(movie?.title);
    if (!movie?.id || !title) {
      return;
    }
    const page = `${SITE}/biografer/${encodeURIComponent(
      mirror.cinemaSlug as string
    )}/film/${encodeURIComponent(String(movie.id))}/${slugOf(title)}`;
    const minutes = Number(movie.run_time) > 0 ? Number(movie.run_time) : 0;
    (Array.isArray(entry.sessions) ? entry.sessions : []).forEach(
      (session: any) => {
        const id = String(session?.id || '');
        const start = swedishTime(String(session?.show_date_time || ''));
        if (!id || !start || seen.has(id)) {
          return;
        }
        seen.add(id);
        // bio.se's own number for the screening, which opens the film's
        // page at it; only known when bio.se sells the tickets itself
        const sessionId = /\/sessionId\/([\w-]+)/.exec(
          String(session.payment_link || '')
        )?.[1];
        events.push({
          id,
          title,
          description: describeScreening(movie, session),
          start,
          end: new Date(
            start.getTime() + (minutes || DEFAULT_MINUTES) * 60 * 1000
          ),
          isCancelled: false,
          // The posters are the distributors'; only with leave to show them
          imageUrl:
            mirror.hasPosterPermission &&
            /^https:\/\/\S+$/.test(String(movie.poster_url || ''))
              ? String(movie.poster_url)
              : undefined,
          tags: [],
          url: sessionId
            ? `${page}?cinemaId=${mirror.cinemaId}&sessionId=${sessionId}`
            : page,
        });
      }
    );
  });
  return events;
}

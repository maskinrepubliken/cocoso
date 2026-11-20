// The site's addresses, in one place. The code names each section by its
// key ('activities', 'resources', …: also the menu item's name and the
// feature flag); the address shows the Swedish segment given here, without
// å, ä and ö. Build every in-app link with sitePath() and declare every
// route with segment(), so a section's address is changed here and nowhere
// else. A key that is not listed is its own segment (info, guide, admin).
const SEGMENTS: Record<string, string> = {
  // Content
  activities: 'evenemang',
  calendar: 'kalender',
  resources: 'platser',
  businesses: 'ata-handla-bo',
  people: 'arrangorer',
  groups: 'foreningar',
  works: 'forfragningar',
  cp: 'sida',
  locations: 'orter',
  search: 'sok',
  // Account
  login: 'logga-in',
  register: 'skapa-konto',
  welcome: 'valkommen',
  // Help and mailings
  about: 'om',
  newsletters: 'nyhetsbrev',
  unsubscribe: 'avregistrera',
};

/** The URL segment of a section: segment('activities'). */
export const segment = (key: string): string => SEGMENTS[key] || key;

/** The section a URL segment belongs to; the segment itself if it has none. */
export const sectionOf = (urlSegment: string): string =>
  Object.keys(SEGMENTS).find((key) => SEGMENTS[key] === urlSegment) ||
  urlSegment;

/** Every segment in use at the site root, for names that must not clash. */
export const usedSegments = (): string[] => Object.values(SEGMENTS);

/**
 * The path of a section or of something in it:
 * sitePath('activities'), sitePath('resources', id), and under a profile
 * sitePath('@name/works', id). Only the section is translated; what follows
 * (ids, page titles) is used as given.
 */
export function sitePath(
  section: string,
  ...rest: Array<string | null | undefined>
): string {
  const head = section
    .split('/')
    .filter(Boolean)
    .map((part) => (part.startsWith('@') ? part : segment(part)));
  return `/${[...head, ...rest.filter(Boolean)].join('/')}`;
}

/** The sections of a path, as keys: sectionsOf('/evenemang/abc')[0]. */
export const sectionsOf = (pathname: string): string[] =>
  pathname.split('/').filter(Boolean).map(sectionOf);

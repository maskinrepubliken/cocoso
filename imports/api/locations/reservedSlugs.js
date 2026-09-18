// Slugs a location may not use, because the same URL segment already means
// something else at the site root (see imports/appRoutes.js). Usernames are
// safe because profile URLs always start with '@'.
export const RESERVED_SLUGS = [
  'activities',
  'admin',
  'calendar',
  'cp',
  'forgot-password',
  'groups',
  'info',
  'login',
  'media',
  'newsletters',
  'not-found',
  '404',
  'people',
  'register',
  'reset-password',
  'resources',
  'terms-&-privacy-policy',
  'works',
];

const TRANSLITERATIONS = {
  å: 'a',
  ä: 'a',
  ö: 'o',
  æ: 'ae',
  ø: 'o',
  é: 'e',
  è: 'e',
  ü: 'u',
};

export function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[åäöæøéèü]/g, (ch) => TRANSLITERATIONS[ch] || ch)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function isReservedSlug(slug) {
  return !slug || slug.startsWith('@') || RESERVED_SLUGS.includes(slug);
}

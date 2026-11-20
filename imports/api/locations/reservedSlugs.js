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

// A place's page is /orter/<slug>, so its slug cannot clash with another
// address; it only has to be there, and not look like a profile.
export function isReservedSlug(slug) {
  return !slug || slug.startsWith('@');
}

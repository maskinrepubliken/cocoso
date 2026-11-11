// The site comes in four seasonal variants and switches by date. Fixed
// months (meteorological seasons as used in Sweden) so the change is
// predictable and testable: spring is March–May, summer June–August,
// autumn September–November, winter December–February.
export type Season = 'var' | 'sommar' | 'host' | 'vinter';

export const SEASONS: Season[] = ['var', 'sommar', 'host', 'vinter'];

// Each season's floor (--cocoso-season-golv), for what cannot read the CSS
// variable: the browser's theme-color and the app manifest.
export const SEASON_FLOOR: Record<Season, string> = {
  var: '#e9f3dc',
  sommar: '#edf3df',
  host: '#eeeedb',
  vinter: '#eceee7',
};

export function getSeason(date: Date = new Date()): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'var';
  if (month >= 6 && month <= 8) return 'sommar';
  if (month >= 9 && month <= 11) return 'host';
  return 'vinter';
}

export function isSeason(value: unknown): value is Season {
  return typeof value === 'string' && (SEASONS as string[]).includes(value);
}

// Season for a request or page: an explicit override (`?season=vinter`
// while designing) wins, then the season an admin locked in the site's
// settings, then the calendar.
export function resolveSeason(
  override?: unknown,
  date?: Date,
  locked?: unknown
): Season {
  if (isSeason(override)) return override;
  if (isSeason(locked)) return locked;
  return getSeason(date);
}

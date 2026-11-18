import { Meteor } from 'meteor/meteor';

// Whole sections of the site that can be switched off. A switched-off
// feature is gone, not just out of the menu: no routes (its URLs are a 404),
// no search results, no landing-page sections, no create button, no admin
// listing, and its methods answer as if there were nothing. The data stays
// in the database, so switching a feature back on brings everything back.
//
// Admins switch them under Inställningar › Funktioner, which stores the
// choice in the site document (`site.features`, see setFeature in
// site.features.js). The values here are the defaults for a feature no
// admin has set. Both server and client apply the stored ones with
// applyFeatures before anything is rendered.
export const DEFAULT_FEATURES = {
  groups: false, // Grupper
  works: false, // Förfrågningar
  // Documents on places, requests and groups: adding them from the gear,
  // the list on the page, and the methods behind them.
  documents: false,
};

export type Feature = keyof typeof DEFAULT_FEATURES;
export type FeatureValues = Partial<Record<Feature, boolean>>;

export const FEATURE_NAMES = Object.keys(DEFAULT_FEATURES) as Feature[];

// What is in force now: the defaults, with what the admins stored on top.
const current: Record<Feature, boolean> = { ...DEFAULT_FEATURES };

// Takes the site document's `features`. Anything not stored, or not a
// boolean, falls back to its default.
export function applyFeatures(stored?: FeatureValues | null) {
  FEATURE_NAMES.forEach((name) => {
    const value = stored?.[name];
    current[name] = typeof value === 'boolean' ? value : DEFAULT_FEATURES[name];
  });
}

export const isFeature = (name: unknown): name is Feature =>
  typeof name === 'string' && FEATURE_NAMES.includes(name as Feature);

// Anything that is not a feature (a menu item like 'activities') is on.
export function isFeatureEnabled(name: string): boolean {
  return current[name as Feature] !== false;
}

// A menu item shows when an admin made it visible and its feature is on.
export function isMenuItemShown(
  item?: { name: string; isVisible?: boolean } | null
): boolean {
  return Boolean(item?.isVisible) && isFeatureEnabled(item!.name);
}

type Method = (this: unknown, ...args: unknown[]) => unknown;

// Wraps a module's methods so that, with the feature off, the listing
// methods named in `lists` return [] and every other method throws.
export function featureMethods<T extends Record<string, Method>>(
  feature: Feature,
  lists: (keyof T)[],
  methods: T
): T {
  const wrapped = {} as Record<string, Method>;
  Object.entries(methods).forEach(([name, method]) => {
    wrapped[name] = function featureGuarded(this: unknown, ...args: unknown[]) {
      if (isFeatureEnabled(feature)) {
        return method.apply(this, args);
      }
      if (lists.includes(name)) {
        return [];
      }
      throw new Meteor.Error('feature-disabled', `${feature} is switched off`);
    };
  });
  return wrapped as T;
}

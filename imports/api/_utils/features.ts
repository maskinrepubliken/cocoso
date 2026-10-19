import { Meteor } from 'meteor/meteor';

// Whole sections of the site that can be switched off. A switched-off
// feature is gone, not just out of the menu: no routes (its URLs are a 404),
// no search results, no landing-page sections, no create button, no admin
// listing, and its methods answer as if there were nothing. The data stays
// in the database, so switching a feature back on brings everything back.
// Change a value here and commit; it is read on both server and client.
export const FEATURES = {
  groups: false, // Föreningar
  works: false, // Förfrågningar
};

export type Feature = keyof typeof FEATURES;

// Anything that is not a feature (a menu item like 'activities') is on.
export function isFeatureEnabled(name: string): boolean {
  return FEATURES[name as Feature] !== false;
}

// A menu item shows when an admin made it visible and its feature is on.
export function isMenuItemShown(item: {
  name: string;
  isVisible?: boolean;
}): boolean {
  return Boolean(item?.isVisible) && isFeatureEnabled(item.name);
}

// Wraps a module's methods so that, with the feature off, the listing
// methods named in `lists` return [] and every other method throws.
export function featureMethods<T extends Record<string, Function>>(
  feature: Feature,
  lists: (keyof T)[],
  methods: T
): T {
  const wrapped = {} as Record<string, Function>;
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

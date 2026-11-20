import { useSearchParams } from 'react-router';
import { useAtomValue } from 'jotai';

import { locationsAtom } from '/imports/state';
import { kindsOf } from '/imports/api/_utils/kinds';

import { isBookablePlace } from '/imports/ui/generic/BookableChip';

import type { EventView, EventWhen } from './EventViewMenu';

// What the Filter menu narrows events to, read from and written to the
// address: ?kind= and ?ort= (lists), ?showPast= and ?when=; on the Platser
// page also ?bookable=1. Shared by the events page, the
// calendar and the Platser page, so they filter alike.
export default function useEventFilters(
  listing: 'activities' | 'calendar' | 'resources'
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const locations = useAtomValue(locationsAtom);

  const listParam = (name: string) =>
    (searchParams.get(name) || '').split(',').filter(Boolean);
  const setParams = (change: Record<string, string | null>) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      Object.entries(change).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      return next;
    });

  // The chosen kinds: one from a strip, any number from the menu. Kinds
  // checked in the menu are marked (?filter=1) and turn the Filter on; a
  // kind or "Alla" picked in the strip clears the mark and turns it off.
  const kinds = listParam('kind');
  const oneKind = kinds.length === 1 ? kinds[0] : '';
  const kindsFromMenu = searchParams.get('filter') === '1';
  const setKinds = (keys: string[], fromMenu = false) =>
    setParams({
      kind: keys.join(','),
      filter: fromMenu && keys.length ? '1' : null,
    });
  const toggleKind = (key: string) =>
    setKinds(
      kinds.includes(key) ? kinds.filter((k) => k !== key) : [...kinds, key],
      true
    );

  // The chosen places (orter)
  const placeSlugs = listParam('ort');
  const togglePlace = (slug: string) =>
    setParams({
      ort: (placeSlugs.includes(slug)
        ? placeSlugs.filter((s) => s !== slug)
        : [...placeSlugs, slug]
      ).join(','),
    });
  const placeIds = new Set(
    locations
      .filter((location: any) => placeSlugs.includes(location.slug))
      .map((location: any) => location._id)
  );

  // Platser only: only the places that can be booked
  const onlyBookable =
    listing === 'resources' && searchParams.get('bookable') === '1';
  const toggleBookable = () =>
    setParams({ bookable: onlyBookable ? null : '1' });

  // Chosen places keep the events for the whole municipality too, as a
  // place's own page does.
  const matches = (item: {
    kinds?: string[] | null;
    category?: { key?: string } | null;
    locationId?: string | null;
    isMunicipalityOnly?: boolean;
    booking?: object | null;
  }) =>
    (!onlyBookable || isBookablePlace(item)) &&
    (!kinds.length || kindsOf(item).some((key) => kinds.includes(key))) &&
    (!placeIds.size ||
      placeIds.has(item.locationId || '') ||
      (!item.locationId && !item.isMunicipalityOnly));

  // Past or upcoming, and a stretch of days
  const showPast = searchParams.get('showPast') === 'true';
  const when = (searchParams.get('when') || '') as EventWhen;
  const view: EventView = { showPast, when: showPast ? '' : when };
  const setView = (change: Partial<EventView>) =>
    setParams({
      ...(change.showPast !== undefined
        ? { showPast: change.showPast ? 'true' : 'false' }
        : {}),
      ...(change.when !== undefined ? { when: change.when || null } : {}),
    });

  // Anything chosen in the menu, a single kind too
  const isNarrowed =
    Boolean(view.when) ||
    (kinds.length > 0 && (kindsFromMenu || listing === 'calendar')) ||
    placeSlugs.length > 0 ||
    onlyBookable;

  const menuOnly = { bookable: null };
  const resetAll = () =>
    setParams({ kind: null, filter: null, ort: null, when: null, ...menuOnly });

  // A kind (or "Alla", with no key) picked in the strip: it, the strip's
  // "Alla" and the Filter are one choice, so the menu's narrowing goes.
  const pickFromStrip = (key: string) =>
    setParams({
      kind: key || null,
      filter: null,
      ort: null,
      when: null,
      ...menuOnly,
    });

  return {
    locations,
    kinds,
    oneKind,
    setKinds,
    toggleKind,
    placeSlugs,
    togglePlace,
    // for memo dependencies
    filterKey: `${kinds.join(',')}|${[...placeIds].join(',')}|${
      view.when
    }|${onlyBookable}`,
    matches,
    view,
    setView,
    onlyBookable,
    toggleBookable,
    isNarrowed,
    resetAll,
    pickFromStrip,
  };
}

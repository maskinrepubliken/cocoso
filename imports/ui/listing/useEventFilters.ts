import { useNavigate, useSearchParams } from 'react-router';
import { useAtomValue } from 'jotai';

import { locationsAtom } from '/imports/state';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';

import type { EventView, EventWhen } from './EventViewMenu';

// What the Filter menu narrows events to, read from and written to the
// address: ?kind= and ?ort= (lists), ?showPast= and ?when=. Shared by the
// events page and the calendar, so the two filter alike.
export default function useEventFilters(listing: 'activities' | 'calendar') {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const locations = useAtomValue(locationsAtom);
  const currentLocation = useCurrentLocation();

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

  // The chosen kinds: one from a strip, any number from the menu
  const kinds = listParam('kind');
  const oneKind = kinds.length === 1 ? kinds[0] : '';
  const setKinds = (keys: string[]) => setParams({ kind: keys.join(',') });
  const toggleKind = (key: string) =>
    setKinds(
      kinds.includes(key) ? kinds.filter((k) => k !== key) : [...kinds, key]
    );

  // The chosen places (orter). Inside a place it is that one, and the page
  // only holds its events; choosing more goes to the whole municipality
  // with all of them chosen.
  const placeSlugs = currentLocation
    ? [currentLocation.slug]
    : listParam('ort');
  const togglePlace = (slug: string) => {
    const next = placeSlugs.includes(slug)
      ? placeSlugs.filter((s) => s !== slug)
      : [...placeSlugs, slug];
    if (!currentLocation) {
      setParams({ ort: next.join(',') });
      return;
    }
    const params = new URLSearchParams(searchParams);
    if (next.length) params.set('ort', next.join(','));
    else params.delete('ort');
    const query = params.toString();
    navigate(`/${listing}${query ? `?${query}` : ''}`);
  };
  const placeIds = new Set(
    locations
      .filter((location: any) => placeSlugs.includes(location.slug))
      .map((location: any) => location._id)
  );

  // Chosen places keep the events for the whole municipality too, as a
  // place's own page does.
  const matches = (item: {
    kind?: string;
    category?: { key?: string } | null;
    locationId?: string | null;
    isMunicipalityOnly?: boolean;
  }) =>
    (!kinds.length || kinds.includes(item.kind || item.category?.key || '')) &&
    (Boolean(currentLocation) ||
      !placeIds.size ||
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

  const isNarrowed =
    Boolean(view.when) ||
    kinds.length > 1 ||
    (!currentLocation && placeSlugs.length > 0);

  const resetAll = () => setParams({ kind: null, ort: null, when: null });

  return {
    locations,
    currentLocation,
    kinds,
    oneKind,
    setKinds,
    toggleKind,
    placeSlugs,
    togglePlace,
    // for memo dependencies
    filterKey: `${kinds.join(',')}|${[...placeIds].join(',')}|${view.when}`,
    matches,
    view,
    setView,
    isNarrowed,
    resetAll,
  };
}

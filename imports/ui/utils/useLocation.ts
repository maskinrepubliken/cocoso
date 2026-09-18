import { useLocation as useRouterLocation } from 'react-router';
import { useAtomValue } from 'jotai';

import { locationsAtom } from '/imports/state';
import type { Location } from '/imports/ui/types';

// Looks a published location up from the list loaded at boot.
export function useLocationById(
  locationId?: string | null
): Location | undefined {
  const locations = useAtomValue(locationsAtom);
  if (!locationId) {
    return undefined;
  }
  return locations.find((location) => location._id === locationId);
}

export function useLocationName(locationId?: string | null): string | null {
  return useLocationById(locationId)?.name || null;
}

// The location whose pages we are on, taken from the first URL segment so it
// is the same on the server and in the browser. Undefined at the root.
export function useCurrentLocation(): Location | undefined {
  const locations = useAtomValue(locationsAtom);
  const { pathname } = useRouterLocation();
  const first = pathname.split('/')[1];
  if (!first || first.startsWith('@')) {
    return undefined;
  }
  return locations.find((location) => location.slug === first);
}

// '' at the root, '/<slug>' inside a location. Prepend it to in-app links so
// visitors stay within the place they are browsing.
export function useLocationPrefix(): string {
  const location = useCurrentLocation();
  return location ? `/${location.slug}` : '';
}

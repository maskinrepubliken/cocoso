import { useLocation as useRouterLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';

import { locationsAtom } from '/imports/state';
import { segment } from '/imports/api/_utils/paths';
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

// The one place the page is about: a place's own page (/orter/<slug>), or
// a listing narrowed to a single place (?ort=<slug>). Taken from the
// address, so it is the same on the server and in the browser. Undefined
// for the whole municipality and when several places are chosen.
export function useCurrentLocation(): Location | undefined {
  const locations = useAtomValue(locationsAtom);
  const { pathname, search } = useRouterLocation();
  const [first, second] = pathname.split('/').filter(Boolean);
  const chosen = (new URLSearchParams(search).get('ort') || '')
    .split(',')
    .filter(Boolean);
  const slug =
    first === segment('locations')
      ? second
      : chosen.length === 1
      ? chosen[0]
      : null;
  return slug
    ? locations.find((location) => location.slug === slug)
    : undefined;
}

// Tag text for an item's place: the place name, a "municipality only"
// marker, or nothing for municipality-wide content.
export function useLocationTag(item?: {
  locationId?: string | null;
  isMunicipalityOnly?: boolean;
}): string | null {
  const { t } = useTranslation('common');
  const name = useLocationName(item?.locationId);
  if (name) {
    return name;
  }
  return item?.isMunicipalityOnly ? t('locations.municipalityOnlyShort') : null;
}

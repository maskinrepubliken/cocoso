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

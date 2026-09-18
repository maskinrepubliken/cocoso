import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Select } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { locationsAtom } from '/imports/state';
import type { Location } from '/imports/ui/types';

export interface LocationSelectProps {
  value?: string | null;
  disabled?: boolean;
  onChange: (locationId: string | null) => void;
}

// Picks the place a piece of content belongs to. Signed-in users see every
// place, published or not, so content can be filed before a place goes live.
export default function LocationSelect({
  value,
  disabled = false,
  onChange,
}: LocationSelectProps) {
  const publishedLocations = useAtomValue(locationsAtom);
  const [locations, setLocations] = useState<Location[]>(publishedLocations);
  const [tc] = useTranslation('common');

  useEffect(() => {
    call('getLocationsForContent')
      .then((all: Location[]) => all && setLocations(all))
      .catch(() => setLocations(publishedLocations));
  }, []);

  return (
    <Select
      disabled={disabled}
      value={value || ''}
      onChange={(event) => onChange(event.target.value || null)}
    >
      <option value="">{tc('locations.wholeMunicipality')}</option>
      {locations.map((location) => (
        <option key={location._id} value={location._id}>
          {location.name}
          {location.isPublished === false
            ? ` (${tc('locations.unpublished')})`
            : ''}
        </option>
      ))}
    </Select>
  );
}

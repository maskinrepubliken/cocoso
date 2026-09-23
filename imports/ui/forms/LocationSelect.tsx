import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Select } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { locationsAtom } from '/imports/state';
import type { Location } from '/imports/ui/types';

const MUNICIPALITY_ONLY = '__municipality_only__';

export interface LocationChoice {
  locationId: string | null;
  isMunicipalityOnly: boolean;
}

export interface LocationSelectProps {
  value?: string | null;
  isMunicipalityOnly?: boolean;
  // Offer "only on the municipality page" as a choice. Off for resources,
  // which are physical places.
  allowMunicipalityOnly?: boolean;
  disabled?: boolean;
  onChange: (choice: LocationChoice) => void;
}

// Picks the place a piece of content belongs to. Signed-in users see every
// place, published or not, so content can be filed before a place goes live.
export default function LocationSelect({
  value,
  isMunicipalityOnly = false,
  allowMunicipalityOnly = false,
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

  const selected = value || (isMunicipalityOnly ? MUNICIPALITY_ONLY : '');

  const handleChange = (raw: string) => {
    if (raw === MUNICIPALITY_ONLY) {
      onChange({ locationId: null, isMunicipalityOnly: true });
      return;
    }
    onChange({ locationId: raw || null, isMunicipalityOnly: false });
  };

  return (
    <Select
      disabled={disabled}
      value={selected}
      onChange={(event) => handleChange(event.target.value)}
    >
      <option value="">{tc('locations.wholeMunicipality')}</option>
      {allowMunicipalityOnly && (
        <option value={MUNICIPALITY_ONLY}>
          {tc('locations.municipalityOnly')}
        </option>
      )}
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

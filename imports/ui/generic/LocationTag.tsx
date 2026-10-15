import React from 'react';
import { Link } from 'react-router';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import { locationsAtom } from '/imports/state';
import { worldForLocation } from '/imports/ui/utils/locationPalette';

import PlaceTag from './PlaceTag';

const TagLink = styled(Link, {
  borderRadius: '999px',
  display: 'inline-flex',
  textDecoration: 'none',
  '&:hover .place-tag': { textDecoration: 'underline' },
});

interface LocationTagProps {
  locationId?: string | null;
  isMunicipalityOnly?: boolean;
  // On a photo the tag is paper; elsewhere it takes the place's tint.
  onImage?: boolean;
  // Without the pill behind it, on a card's own paper.
  bare?: boolean;
}

// An item's ort as the coloured tag used on the listing cards and in the
// header, linking to the place's own page. "Bara kommunen" for content
// shown only on the municipality pages; nothing for municipality-wide.
export default function LocationTag({
  locationId,
  isMunicipalityOnly,
  onImage,
  bare,
}: LocationTagProps) {
  const [tc] = useTranslation('common');
  const locations = useAtomValue(locationsAtom);
  const location = locationId
    ? locations.find((l) => l._id === locationId)
    : undefined;

  if (!location) {
    return isMunicipalityOnly ? (
      <PlaceTag
        className={bare ? 'bare' : ''}
        name={tc('locations.municipalityOnlyShort')}
        onImage={onImage}
      />
    ) : null;
  }

  return (
    <TagLink to={`/${location.slug}`}>
      <PlaceTag
        className={bare ? 'bare' : ''}
        name={location.name}
        onImage={onImage}
        world={worldForLocation(locations, location._id)}
      />
    </TagLink>
  );
}

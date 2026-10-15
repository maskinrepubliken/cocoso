import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import { AddressDetails } from '/imports/ui/generic/ContactDetails';
import { hasAddress, type Address } from '/imports/api/_utils/address';

import Section, { Muted, Strong } from './Section';

const PlaceLink = styled(Link, {
  color: 'var(--cocoso-colors-theme-800)',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
});

const ExternalLink = styled('a', {
  color: 'var(--cocoso-colors-theme-700)',
  display: 'inline-block',
  fontSize: '0.85rem',
  marginTop: '0.625rem',
});

const AddressBox = styled('div', { marginTop: '0.5rem' });

interface PlaceSectionProps {
  activity: {
    resource?: string;
    resourceId?: string;
    place?: string;
    // The place's address, or the event's own (activity.place.js).
    placeAddress?: Partial<Address> | null;
  };
  locationName?: string | null;
}

// Where: the place (a link to its page) and its address, or the event's
// own name and address when it is not held at a place.
export default function PlaceSection({
  activity,
  locationName,
}: PlaceSectionProps) {
  const [tc] = useTranslation('common');
  const prefix = useLocationPrefix();
  const { resource, resourceId, place, placeAddress } = activity;
  const withAddress = hasAddress(placeAddress);

  if (!resource && !place && !withAddress) {
    return null;
  }

  // Without an address, a search for the name is the best the map can do.
  const mapQuery = [resource || place, locationName].filter(Boolean).join(', ');

  return (
    <Section order={5} title={tc('event.sections.where')}>
      {resource && resourceId ? (
        <Strong>
          <PlaceLink to={`${prefix}/resources/${resourceId}`}>
            {resource}
          </PlaceLink>
        </Strong>
      ) : (
        (resource || place) && <Strong>{resource || place}</Strong>
      )}
      {resource && place && place !== resource && <Muted>{place}</Muted>}
      {locationName && <Muted>{locationName}</Muted>}
      {withAddress ? (
        <AddressBox>
          <AddressDetails address={placeAddress} />
        </AddressBox>
      ) : (
        <ExternalLink
          href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
            mapQuery
          )}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {tc('event.place.map')}
        </ExternalLink>
      )}
    </Section>
  );
}

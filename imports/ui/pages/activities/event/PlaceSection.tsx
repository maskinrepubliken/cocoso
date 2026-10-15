import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import AddressBlock from '/imports/ui/generic/AddressBlock';
import LocationTag from '/imports/ui/generic/LocationTag';
import { hasAddress, type Address } from '/imports/api/_utils/address';

import Section, { Muted, SectionTitle, Strong } from './Section';

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

const TagRow = styled('div', { marginTop: '0.25rem' });

interface PlaceSectionProps {
  activity: {
    resource?: string;
    resourceId?: string;
    place?: string;
    // The place's address, or the event's own (activity.place.js).
    placeAddress?: Partial<Address> | null;
    locationId?: string;
    isMunicipalityOnly?: boolean;
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
  const {
    resource,
    resourceId,
    place,
    placeAddress,
    locationId,
    isMunicipalityOnly,
  } = activity;
  const withAddress = hasAddress(placeAddress);

  if (!resource && !place && !withAddress) {
    return null;
  }

  // Without an address, a search for the name is the best the map can do.
  const mapQuery = [resource || place, locationName].filter(Boolean).join(', ');

  // Title, place and ort; under the map when there is one.
  const heading = (
    <>
      <SectionTitle css={{ marginBottom: '0.875rem' }}>
        {tc('event.sections.where')}
      </SectionTitle>
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
      {(locationId || isMunicipalityOnly) && (
        <TagRow>
          <LocationTag
            bare
            isMunicipalityOnly={isMunicipalityOnly}
            locationId={locationId}
          />
        </TagRow>
      )}
    </>
  );

  return (
    <Section bleed order={5}>
      {withAddress ? (
        <AddressBlock
          address={placeAddress}
          edge="top"
          heading={heading}
          label={resource || place}
        />
      ) : (
        <>
          {heading}
          <ExternalLink
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
              mapQuery
            )}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {tc('event.place.map')}
          </ExternalLink>
        </>
      )}
    </Section>
  );
}

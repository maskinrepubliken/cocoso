import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

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

interface PlaceSectionProps {
  activity: {
    resource?: string;
    resourceId?: string;
    place?: string;
    address?: string;
  };
  locationName?: string | null;
}

export default function PlaceSection({
  activity,
  locationName,
}: PlaceSectionProps) {
  const [tc] = useTranslation('common');
  const prefix = useLocationPrefix();
  const { resource, resourceId, place, address } = activity;

  if (!resource && !place && !address) {
    return null;
  }

  const mapQuery = [address || resource || place, locationName]
    .filter(Boolean)
    .join(', ');

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
      {address && (
        <Muted>
          {tc('event.place.address')}: {address}
        </Muted>
      )}
      {locationName && <Muted>{locationName}</Muted>}
      <ExternalLink
        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
          mapQuery
        )}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {tc('event.place.map')}
      </ExternalLink>
    </Section>
  );
}

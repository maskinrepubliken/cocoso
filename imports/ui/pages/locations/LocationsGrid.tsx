import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Center, Flex, Heading } from '/imports/ui/core';
import { locationsAtom } from '/imports/state';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

interface LocationCardsProps {
  locations: any[];
}

// One card per place: its image (or generated shapes) with the name over a
// dark fade. Used by the start page's hero.
export function LocationCards({ locations }: LocationCardsProps) {
  return (
    <div className="location-cards">
      {locations.map((location) => {
        const imageUrl = getImageUrl(location.images?.[0], 'small');
        return (
          <Link
            key={location._id}
            className="location-card"
            to={`/${location.slug}`}
            style={imageUrl ? { backgroundImage: `url('${imageUrl}')` } : undefined}
          >
            {!imageUrl && (
              <PlaceholderImage
                seed={location._id}
                style={{ left: 0, position: 'absolute', top: 0 }}
              />
            )}
            <span className="location-card-name">{location.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

// The municipality's places with a heading, for pages other than the start
// page that want the same way in.
export default function LocationsGrid() {
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');

  if (!locations || locations.length === 0) {
    return null;
  }

  return (
    <Box className="locations-grid" mb="8" px="4">
      <Center mb="4">
        <Heading size="md" textAlign="center">
          {tc('locations.grid.title')}
        </Heading>
      </Center>
      <Flex justify="center">
        <LocationCards locations={locations} />
      </Flex>
    </Box>
  );
}

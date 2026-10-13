import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Center, Flex, Heading } from '/imports/ui/core';
import { locationsAtom } from '/imports/state';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { worldForPlace } from '/imports/ui/utils/locationPalette';
import Stamp from '/imports/ui/generic/Stamp';

interface LocationCardsProps {
  locations: any[];
  // A first card for the whole municipality, leading to everything at once
  all?: { name: string; to: string };
}

// One card per place: its image (or generated shapes) with the name over a
// dark fade. Used by the start page and anywhere else that offers the
// places as a way in.
export function LocationCards({ locations, all }: LocationCardsProps) {
  return (
    <div className="location-cards">
      {all && (
        <Link className="location-card location-card-all" to={all.to}>
          <PlaceholderImage
            className="location-card-shapes"
            seed="hela-kommunen"
            style={{ left: 0, position: 'absolute', top: 0 }}
          />
          <Stamp className="location-card-stamp" name={all.name} size="sm" />
          <span className="location-card-name">{all.name}</span>
        </Link>
      )}
      {locations.map((location, index) => {
        const imageUrl = getImageUrl(location.images?.[0], 'small');
        const world = worldForPlace(location, index);
        return (
          <Link
            key={location._id}
            className={`location-card world-${world.key}`}
            to={`/${location.slug}`}
            style={
              imageUrl
                ? { backgroundImage: `url('${imageUrl}')` }
                : {
                    backgroundImage: `linear-gradient(135deg, ${world.from}, ${world.to})`,
                  }
            }
          >
            {!imageUrl && (
              <PlaceholderImage
                className="location-card-shapes"
                seed={location._id}
                style={{ left: 0, position: 'absolute', top: 0 }}
              />
            )}
            <Stamp className="location-card-stamp" name={location.name} size="sm" world={world} />
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

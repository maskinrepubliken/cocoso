import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Center, Flex, Heading, Text } from '/imports/ui/core';
import { locationsAtom } from '/imports/state';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

// The municipality's places, shown on the home page as the way into each
// place's own pages.
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
      <Flex gap="4" justify="center" wrap="wrap">
        {locations.map((location) => {
          const imageUrl = getImageUrl(location.images?.[0], 'small');
          return (
            <Link key={location._id} to={`/${location.slug}`}>
              <Box
                css={{
                  backgroundColor: 'var(--cocoso-colors-theme-100)',
                  backgroundImage: imageUrl ? `url('${imageUrl}')` : undefined,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                  borderRadius: 'var(--cocoso-border-radius)',
                  height: '140px',
                  overflow: 'hidden',
                  position: 'relative',
                  width: '220px',
                  '&:hover': { opacity: 0.9 },
                }}
              >
                <Box
                  css={{
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))',
                    bottom: 0,
                    left: 0,
                    padding: '0.75rem',
                    position: 'absolute',
                    right: 0,
                  }}
                >
                  <Text
                    color="white"
                    fontWeight="bold"
                    css={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                  >
                    {location.name}
                  </Text>
                </Box>
              </Box>
            </Link>
          );
        })}
      </Flex>
    </Box>
  );
}

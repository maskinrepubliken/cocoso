import React from 'react';
import { Link } from 'react-router';
import ChevronRightIcon from 'lucide-react/dist/esm/icons/chevron-right';
import { useAtomValue } from 'jotai';

import { Center, Flex, Text } from '/imports/ui/core';
import { siteAtom } from '/imports/state';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';

// Shown under the header while browsing a location. It says where the
// visitor is and links back to the whole municipality; the URL, not a
// cookie, carries the choice.
export default function LocationBar({ siteDoc }: { siteDoc: any }) {
  const site = useAtomValue(siteAtom) || siteDoc;
  const location = useCurrentLocation();

  if (!location) {
    return null;
  }

  return (
    <Center className="location-bar" mb="4" px="4">
      <Flex
        align="center"
        gap="1"
        px="4"
        py="2"
        css={{
          backgroundColor: 'var(--cocoso-colors-theme-50)',
          border: '1px solid var(--cocoso-colors-theme-200)',
          borderRadius: 'var(--cocoso-border-radius)',
        }}
      >
        <Link to="/">
          <Text color="theme.700" fontSize="sm">
            {site?.settings?.name}
          </Text>
        </Link>
        <ChevronRightIcon fontSize={16} />
        <Link to={`/${location.slug}`}>
          <Text fontSize="sm" fontWeight="bold">
            {location.name}
          </Text>
        </Link>
      </Flex>
    </Center>
  );
}

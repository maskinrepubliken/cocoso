import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import { useAtomValue } from 'jotai';

import { Box, Flex, Heading, Text } from '/imports/ui/core';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import { locationsAtom } from '/imports/state';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';

interface LocationSwitcherProps {
  siteName?: string;
  // True when the site has a logo above; the site name is then a small
  // caption rather than the heading.
  hasLogo?: boolean;
}

// The title block of the header. At the root it is the site name with a
// small "choose a place" button beneath; inside a place it becomes the
// place's name, with the site name as a caption linking back to the whole
// municipality. The place is always read from the URL, never stored.
export default function LocationSwitcher({
  siteName,
  hasLogo = false,
}: LocationSwitcherProps) {
  const locations = useAtomValue(locationsAtom);
  const current = useCurrentLocation();
  const navigate = useNavigate();
  const [tc] = useTranslation('common');

  if (!locations || locations.length === 0) {
    if (hasLogo) {
      return null;
    }
    return (
      <Heading
        color="theme.800"
        css={{ fontFamily: 'Raleway, sans-serif', fontWeight: 400 }}
        size="md"
      >
        {siteName}
      </Heading>
    );
  }

  const menuButton = (
    <Flex
      align="center"
      gap="1"
      px="3"
      py="1"
      css={{
        borderRadius: 'var(--cocoso-border-radius)',
        color: 'var(--cocoso-colors-theme-800)',
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-50)' },
      }}
    >
      <MapPinIcon fontSize={18} />
      {current ? (
        <Heading
          color="theme.800"
          css={{ fontFamily: 'Raleway, sans-serif', fontWeight: 500 }}
          size="md"
        >
          {current.name}
        </Heading>
      ) : (
        <Text fontWeight="500">{tc('locations.switcher.choose')}</Text>
      )}
      <ChevronDownIcon fontSize={18} />
    </Flex>
  );

  const menu = (
    <Menu button={menuButton} align="center">
      <MenuItem onClick={() => navigate('/')}>
        <Text fontWeight={current ? 'normal' : 'bold'}>
          {tc('locations.wholeMunicipality')}
        </Text>
      </MenuItem>
      {locations.map((location) => (
        <MenuItem
          key={location._id}
          onClick={() => navigate(`/${location.slug}`)}
        >
          <Text fontWeight={current?._id === location._id ? 'bold' : 'normal'}>
            {location.name}
          </Text>
        </MenuItem>
      ))}
    </Menu>
  );

  return (
    <Flex align="center" direction="column" gap="0">
      {!hasLogo && (
        <Link to="/">
          {current ? (
            <Text color="theme.700" fontSize="sm">
              {siteName}
            </Text>
          ) : (
            <Heading
              color="theme.800"
              css={{ fontFamily: 'Raleway, sans-serif', fontWeight: 400 }}
              size="md"
            >
              {siteName}
            </Heading>
          )}
        </Link>
      )}
      <Box mt={hasLogo ? '2' : '0'}>{menu}</Box>
    </Flex>
  );
}

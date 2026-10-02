import { Meteor } from 'meteor/meteor';
import React from 'react';
import { Link, useLocation } from 'react-router';
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down';
import { useAtomValue } from 'jotai';

import { isDesktopAtom } from '/imports/state';
import { Box, Center, Flex, Image, Text } from '/imports/ui/core';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import { parseTitle } from '/imports/api/_utils/shared';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import LocationSwitcher from './LocationSwitcher';

const isClient = Meteor?.isClient;

if (isClient) {
  import '@szhsin/react-menu/dist/index.css';
  import '@szhsin/react-menu/dist/transitions/zoom.css';
}

const baseTextStyles = {
  borderBottomWidth: '2px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'transparent',
  fontFamily: 'Raleway, sans-serif',
  fontSize: 16,
  fontWeight: '500',
};

export interface InfoPagesMenuProps {
  label: string;
  menuStyles: any;
  pageTitles: any[];
  pathname: string;
  prefix?: string;
  onSelect?: () => void;
}

export function InfoPagesMenu({
  label,
  menuStyles,
  pageTitles,
  pathname,
  prefix = '',
  onSelect,
}: InfoPagesMenuProps) {
  const isCurrentContext = pathname.split('/')?.[1] === 'info';

  const flexStyles = {
    align: 'center',
    pointerEvents: 'none',
    px: '2',
  };

  const textStyles = {
    ...baseTextStyles,
    color: menuStyles?.color || 'gray.600',
    fontStyle: menuStyles?.fontStyle || 'normal',
    marginTop: '0.25rem',
    marginRight: '0.25rem',
    textTransform: menuStyles?.textTransform || 'none',
  };

  const borderColor = menuStyles?.color;

  return (
    <Menu
      align="end"
      id="info-pages-menu"
      suppressHydrationWarning
      button={
        <Flex
          align="center"
          gap="0"
          css={{
            ...flexStyles,
            borderBottom: isCurrentContext
              ? `2px solid ${borderColor}`
              : '2px solid transparent',
            color: menuStyles?.color,
            wrap: 'wrap',
            '&:hover': !isCurrentContext && {
              borderBottomColor: borderColor,
              textDecoration: 'underline',
            },
          }}
        >
          <Text css={textStyles}>{label}</Text>
          <ChevronDownIcon size="16px" />
        </Flex>
      }
    >
      <Box
        id="some-menu"
        key="menu-content-x"
        css={{
          backgroundColor: menuStyles?.backgroundColor,
          maxHeight: '480px',
          maxWidth: '320px',
          overflowY: 'scroll',
          ':hover': {
            backgroundColor: `${menuStyles?.backgroundColor}80`,
          },
        }}
      >
        {pageTitles.map((item) => (
          <MenuItem
            key={item._id}
            as="span"
            id={item._id}
            style={{ padding: '0', width: '100%' }}
          >
            <Link
              style={{ padding: '0.5rem 1rem', width: '100%' }}
              to={`${prefix}/info/${parseTitle(item.title)}`}
              onClick={onSelect}
            >
              <Text css={textStyles}>{item.title}</Text>
            </Link>
          </MenuItem>
        ))}
      </Box>
    </Menu>
  );
}

interface HeaderMenuProps {
  siteDoc: any;
  pageTitles: any[];
}

function HeaderMenu({ siteDoc, pageTitles }: HeaderMenuProps) {
  const location = useLocation();
  const isDesktop = useAtomValue(isDesktopAtom);
  const prefix = useLocationPrefix();

  const settings = siteDoc?.settings;
  const menuStyles = siteDoc?.theme?.menu;
  const pathname = location?.pathname;

  const { isBurgerMenuOnDesktop, isBurgerMenuOnMobile } = settings || {};

  if (isDesktop && isBurgerMenuOnDesktop) {
    return null;
  }

  if (!isDesktop && isBurgerMenuOnMobile) {
    return null;
  }

  const menuItems = settings?.menu?.filter((item: any) => item.isVisible);

  const isCurrentContext = (item: any, index: number) => {
    if (pathname === '/') {
      return index === 0;
    }
    return pathname.includes(item?.name);
  };

  return (
    <Center id="main-menu" mb="3" px="4">
      <Flex
        align="center"
        justify="center"
        p="1"
        wrap="wrap"
        style={menuStyles}
      >
        {menuItems?.map((item, index) =>
          item.name === 'info' ? (
            <InfoPagesMenu
              key="info"
              label={item.label}
              menuStyles={menuStyles}
              pageTitles={pageTitles}
              pathname={pathname}
              prefix={prefix}
            />
          ) : (
            <Link
              key={item.name}
              className="main-menu-item"
              to={
                item.isComposablePage
                  ? `${prefix}/cp/${item.name}`
                  : `${prefix}/${item.name}`
              }
            >
              <Box as="span" px="2">
                <Text
                  css={{
                    ...baseTextStyles,
                    borderBottomColor: isCurrentContext(item, index)
                      ? menuStyles.color
                      : 'transparent',
                    color: menuStyles?.color,
                    '&:hover': {
                      borderBottomColor: menuStyles?.color,
                      borderBottomWidth: '1px',
                    },
                  }}
                >
                  {item.label}
                </Text>
              </Box>
            </Link>
          )
        )}
      </Flex>
    </Center>
  );
}

export interface HeaderProps {
  site: any;
  pageTitles: any[];
  isLogoSmall?: boolean;
}

export default function Header({
  site,
  pageTitles,
  isLogoSmall = false,
}: HeaderProps) {
  if (!site) {
    return null;
  }

  return (
    <Box id="header" w="100%">
      <Center pt="4" pb="2" px="4">
        <Flex align="center" direction="column" gap="0">
          {site.logo && (
            <Link className="logo-container" to="/">
              <Box css={{ maxHeight: isLogoSmall ? '48px' : '96px' }}>
                <Image
                  alt={`${site?.settings?.name} logo`}
                  src={site.logo}
                  css={{
                    height: isLogoSmall ? '48px' : '96px',
                    maxWidth: '360px',
                    objectFit: 'contain',
                    width: '100%',
                  }}
                />
              </Box>
            </Link>
          )}
          <LocationSwitcher
            hasLogo={Boolean(site.logo)}
            siteName={site?.settings?.name}
          />
        </Flex>
      </Center>

      <HeaderMenu siteDoc={site} pageTitles={pageTitles} />
    </Box>
  );
}

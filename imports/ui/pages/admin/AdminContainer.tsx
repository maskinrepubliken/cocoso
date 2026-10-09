import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import Bolt from 'lucide-react/dist/esm/icons/bolt';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { useAtomValue } from 'jotai';

import {
  Alert,
  Badge,
  Box,
  Center,
  Drawer,
  Flex,
  Heading,
  Grid,
  Text,
} from '/imports/ui/core';
import {
  siteAtom,
  isDesktopAtom,
  roleAtom,
  canCreateContentAtom,
} from '/imports/state';
import FeedbackForm from '/imports/ui/layout/FeedbackForm';

import AdminMenu from './AdminMenu';
import getAdminRoutes from './getAdminRoutes';

const iconContainerProps = {
  align: 'center',
  direction: 'column',
  gap: '0',
  p: '2',
  css: { color: 'var(--cocoso-mylla)', cursor: 'pointer' },
};

function AdminHeader({ currentRoute }) {
  return (
    <Box mb="6">
      <Heading mb="2">{currentRoute?.label}</Heading>

      {currentRoute?.description && (
        <Text
          css={{
            color: 'var(--cocoso-mylla-soft)',
            fontSize: '1rem',
            maxWidth: '60ch',
          }}
        >
          {currentRoute?.description}
        </Text>
      )}
    </Box>
  );
}

export default function AdminContainer({ siteDoc }) {
  const siteFromAtom = useAtomValue(siteAtom);
  const site = siteDoc || siteFromAtom;
  const isDesktop = useAtomValue(isDesktopAtom);
  const role = useAtomValue(roleAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);

  const [drawerMenuOpen, setDrawerMenuOpen] = useState(false);
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');
  const [ta] = useTranslation('accounts');
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = site?.settings?.menu;
  const isAdmin = role === 'admin';
  const pathname = location?.pathname;
  // Contributors get the home overview of their own activities, nothing else.
  const allAdminRoutes = getAdminRoutes(menuItems);
  let routes: any[] = [];
  if (isAdmin) {
    routes = allAdminRoutes;
  } else if (canCreateContent) {
    routes = allAdminRoutes.filter((r) => r.value === '/admin/home');
  }

  const getCurrentRoute = () => {
    if (!routes) {
      return null;
    }
    const allRoutes = [];
    routes.forEach((item) => {
      if (item.isMulti) {
        item.content.forEach((itemSub) => {
          allRoutes.push({
            ...itemSub,
            value: itemSub.value.replace('*', ''),
          });
        });
        return;
      }
      allRoutes.push({
        ...item,
        value: item.value?.replace('*', ''),
      });
    });

    allRoutes.push({
      label: ta('profile.settings'),
      value: 'my-profile',
    });

    allRoutes.push({
      description: ta('messages.description'),
      label: (
        <Flex gap="4" align="flex-start">
          {ta('messages.title')}
          <Badge size="lg">beta</Badge>
        </Flex>
      ),
      value: 'messages',
    });

    return allRoutes.find((r) => pathname.includes(r.value));
  };

  const currentRoute = getCurrentRoute();

  const handleItemClick = (item: any) => {
    if (!item) {
      return;
    }
    if (item.isMulti) {
      navigate(item.content[0]?.value);
      if (
        !isDesktop &&
        currentRoute?.value?.split('/')[0] === item?.value?.split('/')[0]
      ) {
        setDrawerMenuOpen(false);
      }
      return;
    }
    navigate(item.value);
    if (!isDesktop) {
      setDrawerMenuOpen(false);
    }
  };

  if (
    !isAdmin &&
    !(canCreateContent && pathname.split('/')[2] === 'home') &&
    pathname.split('/')[2] !== 'my-profile' &&
    pathname.split('/')[2] !== 'messages'
  ) {
    return (
      <Center p="4" h="100vh">
        <Alert type="error">{tc('message.access.deny')}</Alert>
      </Center>
    );
  }

  if (!isDesktop) {
    return (
      <Box css={{ backgroundColor: 'var(--cocoso-season-golv)', minHeight: '100vh' }}>
        <Drawer
          id="admin-menu-drawer"
          open={drawerMenuOpen}
          noPadding
          position="left"
          size="sm"
          title={t('menulabel')}
          onClose={() => setDrawerMenuOpen(false)}
        >
          <AdminMenu routes={routes} onItemClick={handleItemClick} />
        </Drawer>

        <Box>
          <Flex
            align="center"
            justify="space-between"
            w="100%"
            css={{
              backgroundColor: 'var(--cocoso-papper)',
              borderBottom: '1px solid var(--cocoso-linje)',
            }}
          >
            <Flex
              {...iconContainerProps}
              onClick={() => setDrawerMenuOpen(true)}
            >
              <Bolt />
              <Text fontSize="xs">{t('menu.title')}</Text>
            </Flex>
            <Heading
              size="md"
              textAlign="center"
              css={{
                color: 'var(--cocoso-mylla)',
                flexGrow: '1',
              }}
            >
              {isAdmin
                ? t('panel')
                : site?.settings?.shortName || site?.settings?.name}
            </Heading>

            <Link to="/">
              <Flex {...iconContainerProps}>
                <ArrowLeft />
                <Text fontSize="xs">{t('admin:site')}</Text>
              </Flex>
            </Link>
          </Flex>

          <Box p="4" css={{ paddingTop: '1.5rem' }}>
            <AdminHeader currentRoute={currentRoute} />

            <Outlet />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box css={{ backgroundColor: 'var(--cocoso-season-golv)', minHeight: '100vh' }}>
      <Grid h="100%" templateColumns="280px minmax(0, 1fr) 300px">
        <Box>
          <AdminMenu routes={routes} onItemClick={handleItemClick} />
        </Box>

        <Box p="8" css={{ maxWidth: '860px', width: '100%' }}>
          <AdminHeader currentRoute={currentRoute} />
          <Outlet />
        </Box>

        <Box>
          <FeedbackForm />
        </Box>
      </Grid>
    </Box>
  );
}

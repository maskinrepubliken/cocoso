import { Link, useLocation } from 'react-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { useAtomValue } from 'jotai';

import {
  Avatar,
  Badge,
  Box,
  Flex,
  List,
  ListItem,
  Text,
} from '/imports/ui/core';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import {
  siteAtom,
  currentUserAtom,
  isDesktopAtom,
  roleAtom,
} from '/imports/state';
import { getFullName } from '/imports/api/_utils/shared';

// Back to the site: the site's name in Fraunces with an arrow, at the top
// of the admin sidebar.
export function AdminMenuHeader({ site }) {
  return (
    <Link to="/" style={{ width: '100%' }}>
      <Box
        px="4"
        py="3"
        css={{
          borderBottom: '1px solid var(--cocoso-linje)',
          '&:hover': {
            backgroundColor: 'var(--cocoso-colors-theme-50)',
          },
        }}
      >
        <Flex align="center" gap="2" css={{ color: 'var(--cocoso-mylla)' }}>
          <ArrowLeft width={18} height={18} />
          <Text
            css={{
              fontFamily: 'var(--cocoso-font-display)',
              fontVariationSettings: '"SOFT" 60',
              fontSize: '1.05rem',
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {site.settings?.name}
          </Text>
        </Flex>
      </Box>
    </Link>
  );
}

export function AdminUserThumb() {
  const location = useLocation();
  const currentUser = useAtomValue(currentUserAtom);

  if (!currentUser) {
    return null;
  }

  const isCurrentRoute = location?.pathname?.includes('my-profile');
  const avatarSrc = getImageUrl(currentUser.avatar?.src, 'medium') || undefined;

  const fullName = getFullName(currentUser);

  return (
    <Box
      p="3"
      px="4"
      css={{
        backgroundColor: isCurrentRoute
          ? 'var(--cocoso-colors-theme-100)'
          : 'transparent',
        '&:hover': {
          backgroundColor: 'var(--cocoso-colors-theme-50)',
        },
      }}
    >
      <Flex align="center" gap="3">
        <Avatar
          name={currentUser.username}
          size="md"
          src={avatarSrc}
          css={{ backgroundColor: 'var(--cocoso-colors-theme-100)' }}
        />

        <Flex direction="column" css={{ minWidth: 0 }}>
          <Text
            css={{
              color: 'var(--cocoso-mylla)',
              fontFamily: 'var(--cocoso-font-ui)',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentUser.username}
          </Text>
          {fullName && fullName !== '---' && (
            <Text
              fontSize="sm"
              css={{
                color: 'var(--cocoso-mylla-soft)',
                fontFamily: 'var(--cocoso-font-ui)',
              }}
            >
              {fullName}
            </Text>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

function AdminMenuItem({ item, isSub = false, parentValue, onClick }) {
  const location = useLocation();
  const pathname = location?.pathname;

  if (!item) {
    return null;
  }

  const isCurrentRoute = pathname.includes(item.value);

  if (isSub && !pathname.includes(parentValue)) {
    return null;
  }

  const isActive = isCurrentRoute && !item.isMulti;

  // One row in the sidebar: a rounded field, green when it is the page
  // you are on, like the chips in the site's own menu.
  return (
    <Box
      className="admin-menu-item"
      css={{
        backgroundColor: isActive ? 'var(--cocoso-colors-theme-100)' : null,
        borderRadius: 'var(--cocoso-radius-falt)',
        cursor: 'pointer',
        marginLeft: isSub ? '0.9rem' : '0',
        marginBottom: '2px',
        overflow: 'hidden',
        padding: isSub ? '0.4rem 0.75rem' : '0.5rem 0.75rem',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        '&:hover': {
          backgroundColor: isActive
            ? 'var(--cocoso-colors-theme-100)'
            : 'var(--cocoso-colors-theme-50)',
        },
      }}
      onClick={onClick}
    >
      <Text
        css={{
          color: isActive
            ? 'var(--cocoso-colors-theme-800)'
            : 'var(--cocoso-mylla)',
          fontFamily: 'var(--cocoso-font-ui)',
          fontSize: isSub ? '0.9rem' : '0.95rem',
          fontWeight: isCurrentRoute ? 700 : 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </Text>
    </Box>
  );
}

export default function AdminMenu({ routes, onItemClick }) {
  const currentUser = useAtomValue(currentUserAtom);
  const site = useAtomValue(siteAtom);
  const isDesktop = useAtomValue(isDesktopAtom);
  const role = useAtomValue(roleAtom);
  const [t] = useTranslation('admin');
  const [ta] = useTranslation('accounts');

  const isAdmin = role === 'admin';

  if (!site || !currentUser) {
    return null;
  }

  const handleUserThumbClick = () => {
    onItemClick({ value: '/admin/my-profile' });
  };

  const handleMessagesClick = () => {
    onItemClick({ value: '/admin/messages' });
  };

  return (
    <Flex
      h={isDesktop ? '100%' : 'calc(100% - 80px)'}
      w={isDesktop ? '280px' : '100%'}
      css={{
        backgroundColor: 'var(--cocoso-papper)',
        borderRight: isDesktop ? '1px solid var(--cocoso-linje)' : 'none',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'fixed',
      }}
    >
      {isDesktop && <AdminMenuHeader site={site} />}

      <Flex
        direction="column"
        justify="space-between"
        h="100%"
        w="100%"
        css={{ overflowY: 'auto' }}
      >
        {isDesktop && isAdmin && (
          <Text
            css={{
              color: 'var(--cocoso-mylla-soft)',
              flexGrow: '0',
              fontFamily: 'var(--cocoso-font-ui)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '1rem 1.25rem 0.25rem',
              textTransform: 'uppercase',
              width: '100%',
            }}
          >
            {t('panel')}
          </Text>
        )}

        <Box h="100%" p="3" w="100%" css={{ flexGrow: '1', overflowY: 'auto' }}>
          <List w="100%">
            {routes?.map((item) => (
              <ListItem key={item.value} p="0">
                <AdminMenuItem item={item} onClick={() => onItemClick(item)} />
                {item.isMulti &&
                  item.content.map((itemSub) => (
                    <AdminMenuItem
                      key={itemSub.value}
                      item={itemSub}
                      isSub
                      parentValue={item.value}
                      onClick={() => onItemClick(itemSub)}
                    />
                  ))}
              </ListItem>
            ))}
          </List>
        </Box>

        <Box
          w="100%"
          css={{
            flexGrow: '0',
          }}
        >
          <List
            p="0"
            css={{
              backgroundColor: location?.pathname?.includes('messages')
                ? 'var(--cocoso-colors-theme-100)'
                : 'transparent',
              borderTop: '1px solid var(--cocoso-linje)',
              width: '100%',
              '&:hover': {
                backgroundColor: 'var(--cocoso-colors-theme-50)',
              },
            }}
          >
            <ListItem
              css={{
                color: 'var(--cocoso-mylla)',
                cursor: 'pointer',
                fontFamily: 'var(--cocoso-font-ui)',
                fontWeight: 600,
                width: '100%',
              }}
              mb="0"
              px="4"
              py="3"
              onClick={handleMessagesClick}
            >
              {ta('messages.label')} <Badge>beta</Badge>
            </ListItem>
          </List>
          <Box
            css={{ borderTop: '1px solid var(--cocoso-linje)', cursor: 'pointer' }}
            onClick={handleUserThumbClick}
          >
            <AdminUserThumb />
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}

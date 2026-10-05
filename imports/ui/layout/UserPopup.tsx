import { Meteor } from 'meteor/meteor';
import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import BellIcon from 'lucide-react/dist/esm/icons/bell';
import BoltIcon from 'lucide-react/dist/esm/icons/bolt';
import CheckCircleIcon from 'lucide-react/dist/esm/icons/check-circle';
import { useAtom, useAtomValue } from 'jotai';
import MessagesSquare from 'lucide-react/dist/esm/icons/messages-square';

import { clearEncryptionKey } from '/imports/utils/setupEncryption';

import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Text,
} from '/imports/ui/core';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import {
  canCreateContentAtom,
  siteAtom,
  currentUserAtom,
  roleAtom,
} from '/imports/state';
import { getFullName } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';

interface NotificationLinkItemProps {
  item: any;
  children: React.ReactNode;
}

function NotificationLinkItem({ item, children }: NotificationLinkItemProps) {
  return <Link to={`/${item.context}/${item.contextId}`}>{children}</Link>;
}

export interface UserThumbProps {
  notificationsCounter?: number;
}

// The account trigger: a round avatar with the role mark, and a bell with
// the unread count when there is something new.
export function UserThumb({ notificationsCounter = 0 }: UserThumbProps) {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);

  if (!currentUser) {
    return null;
  }

  const avatarUrl = getImageUrl(currentUser.avatar?.src, 'thumb');

  return (
    <span className="site-user" title={getFullName(currentUser)}>
      {notificationsCounter > 0 && (
        <span className="site-user-bell">
          <BellIcon width={18} height={18} />
          <span className="site-user-count">{notificationsCounter}</span>
        </span>
      )}
      <span className="site-avatar">
        {avatarUrl ? (
          <img alt={currentUser.username} src={avatarUrl} />
        ) : (
          currentUser.username?.charAt(0)
        )}
        {role === 'admin' ? (
          <span className="site-avatar-role">
            <BoltIcon width={10} height={10} />
          </span>
        ) : role === 'contributor' ? (
          <span className="site-avatar-role">
            <CheckCircleIcon width={10} height={10} />
          </span>
        ) : null}
      </span>
    </span>
  );
}

export interface UserPopupProps {
  // The site document as the header has it (SSR-safe), so the login link
  // renders the same on the server and at hydration.
  site?: any;
}

export default function UserPopup({ site: siteProp }: UserPopupProps) {
  const [t] = useTranslation('members');
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const siteFromAtom = useAtomValue(siteAtom);
  const site = siteProp || siteFromAtom;
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const navigate = useNavigate();

  if (!site) {
    return null;
  }

  if (!currentUser) {
    return (
      <Link className="site-login" to="/login">
        <Trans i18nKey="common:menu.guest.login">Login</Trans>
      </Link>
    );
  }

  const handleLogout = () => {
    clearEncryptionKey();
    Meteor.logout();
    setCurrentUser(null);
    message.info(<Trans i18nKey="accounts:logout.messages.success" />);
    navigate('/');
  };

  const notifications = currentUser?.notifications;

  const isNotification = notifications && notifications.length > 0;
  let notificationsCounter = 0;
  if (isNotification) {
    notifications.forEach((notification: any) => {
      notificationsCounter = notification.count + notificationsCounter;
    });
  }
  const unreadMessageCount = Math.max(
    0,
    (currentUser as any)?.unreadMessageCount ?? 0
  );
  notificationsCounter += unreadMessageCount;

  const roleTranslated = <Trans i18nKey={`roles.${role}`} ns="members" />;

  const isAdmin = role === 'admin';

  return (
    <Box>
      <Menu
        align="end"
        button={<UserThumb notificationsCounter={notificationsCounter} />}
      >
        <Box p="2">
          <Text fontWeight="bold" fontSize="xl" css={{ marginLeft: '1rem' }}>
            {currentUser.username}{' '}
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '300',
                textTransform: 'lowercase',
              }}
            >
              {roleTranslated}
            </span>
          </Text>
        </Box>

        <Divider />

        <Link to="/admin/messages">
          <MenuItem>
            <Text>
              <Flex align="center" gap="2">
                <MessagesSquare />
                {t('labels.messages')}
                {unreadMessageCount > 0 && (
                  <Badge colorScheme="red" size="sm">
                    {unreadMessageCount}
                  </Badge>
                )}
              </Flex>
            </Text>
          </MenuItem>
        </Link>

        <Divider />

        {isAdmin && (
          <Link to="/admin/home">
            <MenuItem>
              <Text>
                <Flex align="center" gap="2">
                  <BoltIcon fontSize="18" />
                  <Trans i18nKey="members:dashboard">Admin Panel</Trans>
                </Flex>
              </Text>
            </MenuItem>
          </Link>
        )}

        {isAdmin && <Divider />}

        {isNotification && (
          <>
            <Box pl="6" pt="2">
              <Text color="gray.600" size="xs">
                <Trans i18nKey="common:menu.notifications.label">
                  Notifications
                </Trans>
              </Text>
            </Box>
            {notifications.map((item) => (
              <NotificationLinkItem
                key={item.contextId + item.count}
                item={item}
              >
                <MenuItem>
                  <Text>
                    <em>{item.title}</em>{' '}
                  </Text>
                  <Box pl="2">
                    <Badge colorScheme="red" size="xs">
                      {' '}
                      {item.count}
                    </Badge>
                  </Box>
                </MenuItem>
              </NotificationLinkItem>
            ))}
          </>
        )}

        {isNotification && <Divider />}

        <Link to={currentUser && `/@${currentUser?.username}`}>
          <MenuItem>
            <Text>
              <Trans i18nKey="common:menu.member.profile">My Profile</Trans>
            </Text>
          </MenuItem>
        </Link>
        <Link to={'/admin/my-profile'}>
          <MenuItem as="span">
            <Text>
              <Trans i18nKey="common:menu.member.settings">
                Profile Settings
              </Trans>
            </Text>
          </MenuItem>
        </Link>
        {canCreateContent && (
          <Link to="/admin/home">
            <MenuItem as="span">
              <Text>
                <Trans i18nKey="common:menu.member.activities">
                  My Activities
                </Trans>
              </Text>
            </MenuItem>
          </Link>
        )}

        <Divider />

        <Center py="2">
          <Button size="sm" variant="ghost" onClick={() => handleLogout()}>
            <Trans i18nKey="common:actions.logout">Logout</Trans>
          </Button>
        </Center>
      </Menu>
    </Box>
  );
}

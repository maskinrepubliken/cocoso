import React from 'react';
import { Link } from 'react-router';
import { Trans } from 'react-i18next';
import BellIcon from 'lucide-react/dist/esm/icons/bell';
import BoltIcon from 'lucide-react/dist/esm/icons/bolt';
import CheckCircleIcon from 'lucide-react/dist/esm/icons/check-circle';
import LayoutDashboardIcon from 'lucide-react/dist/esm/icons/layout-dashboard';
import LogOutIcon from 'lucide-react/dist/esm/icons/log-out';
import PenLineIcon from 'lucide-react/dist/esm/icons/pen-line';
import SettingsIcon from 'lucide-react/dist/esm/icons/settings';
import UserRoundIcon from 'lucide-react/dist/esm/icons/user-round';
import { useAtomValue } from 'jotai';

import { getImageUrl } from '/imports/ui/utils/imageHelper';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import { siteAtom, currentUserAtom, roleAtom } from '/imports/state';
import { getFullName } from '/imports/api/_utils/shared';
import { isFeatureEnabled } from '/imports/api/_utils/features';
import LanguageSwitch from './LanguageSwitch';
import useLogout from './useLogout';

export interface UserThumbProps {
  notificationsCounter?: number;
}

// The account trigger: a round avatar with the role mark, a bell with the
// unread count when there is something new, and the username, which the
// header shows only while its bar has room for it (see Header.tsx).
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
          <BellIcon width={16} height={16} />
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
      <span className="site-user-name">{currentUser.username}</span>
    </span>
  );
}

export interface UserPopupProps {
  // The site document as the header has it (SSR-safe), so the login link
  // renders the same on the server and at hydration.
  site?: any;
}

export default function UserPopup({ site: siteProp }: UserPopupProps) {
  const siteFromAtom = useAtomValue(siteAtom);
  const site = siteProp || siteFromAtom;
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const handleLogout = useLogout();

  if (!site) {
    return null;
  }

  // Logged out, the header stays quiet; the login link lives in the
  // footer, since most visitors never log in.
  if (!currentUser) {
    return null;
  }

  // Unread messages in discussions, while those are switched on
  const notifications = isFeatureEnabled('discussions')
    ? currentUser?.notifications
    : null;

  const isNotification = notifications && notifications.length > 0;
  let notificationsCounter = 0;
  if (isNotification) {
    notifications.forEach((notification: any) => {
      notificationsCounter = notification.count + notificationsCounter;
    });
  }

  const isAdmin = role === 'admin';
  // Only organizers (contributors) have a public profile page of their
  // own to go to; admins and plain members do not.
  const isOrganizer = role === 'contributor';

  // The account menu, as plain as the Info menu: a name line, a few links,
  // and logout.
  return (
    <Menu
      align="start"
      button={<UserThumb notificationsCounter={notificationsCounter} />}
    >
      <div className="site-info-menu">
        <div className="site-account-head">
          <span className="site-account-name">{currentUser.username}</span>
          <span className="site-account-role">
            <Trans i18nKey={`roles.${role}`} ns="members" />
          </span>
        </div>

        {isAdmin && (
          <MenuItem style={{ padding: 0 }}>
            <Link
              className="site-info-menu-link site-account-item"
              to="/admin/home"
            >
              <LayoutDashboardIcon width={16} height={16} aria-hidden />
              <Trans i18nKey="members:dashboard">Admin Panel</Trans>
            </Link>
          </MenuItem>
        )}

        {isNotification &&
          notifications.map((item: any) => (
            <MenuItem key={item.contextId + item.count} style={{ padding: 0 }}>
              <Link
                className="site-info-menu-link site-account-notice"
                to={`/${item.context}/${item.contextId}`}
              >
                <span>{item.title}</span>
                <span className="site-account-count">{item.count}</span>
              </Link>
            </MenuItem>
          ))}

        {isOrganizer && (
          <MenuItem style={{ padding: 0 }}>
            <Link
              className="site-info-menu-link site-account-item"
              to={`/@${currentUser.username}`}
            >
              <UserRoundIcon width={16} height={16} aria-hidden />
              <Trans i18nKey="common:menu.member.profile">My Profile</Trans>
            </Link>
          </MenuItem>
        )}

        <MenuItem style={{ padding: 0 }}>
          <Link
            className="site-info-menu-link site-account-item"
            to={`/@${currentUser.username}?edit=true`}
          >
            <PenLineIcon width={16} height={16} aria-hidden />
            <Trans i18nKey="common:entryMenu.edit.profile">Edit profile</Trans>
          </Link>
        </MenuItem>

        {/* On the page one is on: the settings are a dialog over it */}
        <MenuItem style={{ padding: 0 }}>
          <Link
            className="site-info-menu-link site-account-item"
            to="?settings=me"
          >
            <SettingsIcon width={16} height={16} aria-hidden />
            <Trans i18nKey="common:entryMenu.settings.mine">My settings</Trans>
          </Link>
        </MenuItem>

        <div className="site-account-langs">
          <LanguageSwitch variant="row" />
        </div>

        <MenuItem style={{ padding: 0 }}>
          <button
            type="button"
            className="site-info-menu-link site-account-logout"
            onClick={() => handleLogout()}
          >
            <LogOutIcon width={16} height={16} />
            <Trans i18nKey="common:actions.logout">Logout</Trans>
          </button>
        </MenuItem>
      </div>
    </Menu>
  );
}

import React from 'react';
import { Link } from 'react-router';
import { Trans } from 'react-i18next';
import BellIcon from 'lucide-react/dist/esm/icons/bell';
import BoltIcon from 'lucide-react/dist/esm/icons/bolt';
import CheckCircleIcon from 'lucide-react/dist/esm/icons/check-circle';
import LogOutIcon from 'lucide-react/dist/esm/icons/log-out';
import { useAtomValue } from 'jotai';

import { getImageUrl } from '/imports/ui/utils/imageHelper';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import { siteAtom, currentUserAtom, roleAtom } from '/imports/state';
import { getFullName } from '/imports/api/_utils/shared';
import LanguageSwitch from './LanguageSwitch';
import useLogout from './useLogout';

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

  const notifications = currentUser?.notifications;

  const isNotification = notifications && notifications.length > 0;
  let notificationsCounter = 0;
  if (isNotification) {
    notifications.forEach((notification: any) => {
      notificationsCounter = notification.count + notificationsCounter;
    });
  }

  const isAdmin = role === 'admin';
  // Only organizers (admins and contributors) have a public profile page
  // of their own to go to.
  const isOrganizer = isAdmin || role === 'contributor';

  // The account menu, as plain as the Info menu: a name line, a few links,
  // and logout.
  return (
    <Menu
      align="end"
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
            <Link className="site-info-menu-link" to="/admin/home">
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
              className="site-info-menu-link"
              to={`/@${currentUser.username}`}
            >
              <Trans i18nKey="common:menu.member.profile">My Profile</Trans>
            </Link>
          </MenuItem>
        )}

        <MenuItem style={{ padding: 0 }}>
          <Link className="site-info-menu-link" to="/admin/my-profile">
            <Trans i18nKey="common:menu.member.settings">
              Profile Settings
            </Trans>
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

import React, { useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useMatches,
  useParams,
  useSearchParams,
} from 'react-router';
import { useTranslation } from 'react-i18next';
import PenIcon from 'lucide-react/dist/esm/icons/pen-line';
import SettingsIcon from 'lucide-react/dist/esm/icons/settings';
import { useAtomValue } from 'jotai';

import { parseTitle } from '/imports/api/_utils/shared';
import { isFeatureEnabled } from '/imports/api/_utils/features';
import { managesPlace } from '/imports/api/resources/placeAccess';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import {
  canCreateContentAtom,
  currentUserAtom,
  roleAtom,
} from '/imports/state';

const BLOOM_MS = 900;

type Context =
  | 'activities'
  | 'groups'
  | 'resources'
  | 'works'
  | 'info'
  | 'profile'
  | 'userProfile';

interface Editable {
  context: Context;
  id: string;
  username?: string;
  // The entry itself, as the page's loader has it
  item?: any;
}

// What the page under the header shows, taken from its route's loader data,
// and whether this visitor may edit it. Mirrors the server's own checks so
// the gear only appears where the form would be allowed to save.
function useEditable(): Editable | null {
  const matches = useMatches();
  const { pageTitle } = useParams();
  const { pathname } = useLocation();
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);

  if (!currentUser) {
    return null;
  }
  // One's own profile page: anyone logged in may edit that.
  if (pathname.replace(/\/$/, '') === `/@${currentUser.username}`) {
    return { context: 'profile', id: currentUser._id };
  }
  const isAdmin = role === 'admin';
  // Someone else's organizer page: an admin may edit their profile.
  const profileSlug = pathname.match(/^\/@([^/]+)\/?$/);
  if (profileSlug) {
    return isAdmin
      ? {
          context: 'userProfile',
          id: profileSlug[1],
          username: decodeURIComponent(profileSlug[1]),
        }
      : null;
  }
  if (!canCreateContent) {
    return null;
  }
  const userId = currentUser._id;
  const data = [...matches].reverse().find((match) => match.data)?.data as
    | any
    | undefined;
  if (!data) {
    return null;
  }

  if (data.activity?._id) {
    const { activity } = data;
    const isOrganizer =
      activity.authorId === userId ||
      (activity.organizers || []).some((o: any) => o.userId === userId);
    return isAdmin || isOrganizer
      ? { context: 'activities', id: activity._id, item: activity }
      : null;
  }
  if (data.group?._id) {
    const { group } = data;
    const isGroupAdmin = (group.members || []).some(
      (member: any) => member.memberId === userId && member.isAdmin
    );
    // The site's admins run any group as its owner would
    return isGroupAdmin || isAdmin
      ? { context: 'groups', id: group._id, item: group }
      : null;
  }
  if (data.resource?._id) {
    // A place: those who look after it, and admins
    return isAdmin || managesPlace(userId, data.resource)
      ? { context: 'resources', id: data.resource._id, item: data.resource }
      : null;
  }
  if (data.work?._id) {
    // A request: its author, and admins
    return isAdmin || data.work.authorId === userId
      ? { context: 'works', id: data.work._id, item: data.work }
      : null;
  }
  if (Array.isArray(data.pages) && pageTitle) {
    const page =
      data.pages.find((p: any) => parseTitle(p.title) === pageTitle) ||
      data.pages[0];
    return isAdmin && page
      ? { context: 'info', id: page._id, item: page }
      : null;
  }
  return null;
}

interface GearItem {
  // The search parameter that opens the dialog for it
  param: string;
  label: string;
  isDanger?: boolean;
}

// What the gear offers on each kind of page: the same choices as the old
// admin menus on the page, each opening its dialog through a search
// parameter. Deleting is offered only where the delete dialog would allow
// it, and comes last, in red.
function useGearItems(editable: Editable | null): GearItem[] {
  const [tc] = useTranslation('common');
  const [t] = useTranslation('groups');
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);

  if (!editable?.item || !currentUser) {
    return [];
  }
  const { context, item } = editable;
  const isAdmin = role === 'admin';
  // Documents are a feature
  const documentsOn = isFeatureEnabled('documents');
  const edit = { param: 'edit', label: tc('entryMenu.edit') };
  const addDocument = {
    param: 'addDocument',
    label: tc('entryMenu.addDocument'),
  };
  const remove = {
    param: 'delete',
    label: tc(`entryMenu.delete.${context}`),
    isDanger: true,
  };

  switch (context) {
    case 'activities':
      // An organizer archives an event before it can go; admins may
      // delete straight away
      return isAdmin || (item.isArchived && item.authorId === currentUser._id)
        ? [edit, remove]
        : [edit];
    case 'groups':
      return [
        ...(documentsOn ? [addDocument] : []),
        { param: 'addMeeting', label: t('admin.add_meeting') },
        { param: 'members', label: t('admin.manage_members') },
        ...(item.isPrivate
          ? [{ param: 'invite', label: t('actions.invite') }]
          : []),
        edit,
        ...(isAdmin || item.authorId === currentUser._id ? [remove] : []),
      ];
    case 'resources':
      // Documents and deleting stay with the admins, as before; documents
      // only while that feature is on
      return isAdmin
        ? [...(documentsOn ? [addDocument] : []), edit, remove]
        : [edit];
    case 'works':
      return [...(documentsOn ? [addDocument] : []), edit, remove];
    case 'info':
      return [{ param: 'new', label: tc('entryMenu.newPage') }, edit, remove];
    default:
      return [];
  }
}

// The button in the header next to the plus on a page one may edit: on an
// event, förening, place, request or info page a gear with what can be done
// to it; on a profile a pen to its settings.
export default function EditButton() {
  const [tc] = useTranslation('common');
  const [, setSearchParams] = useSearchParams();
  const editable = useEditable();
  const gearItems = useGearItems(editable);

  // A short bloom each time the button appears for a new page.
  const [animState, setAnimState] = useState<'idle' | 'subtle'>('idle');
  const [seenId, setSeenId] = useState<string | null>(null);
  const id = editable?.id || null;
  if (id !== seenId) {
    setSeenId(id);
    if (id) {
      setAnimState('subtle');
    }
  }
  useEffect(() => {
    if (animState === 'idle') {
      return undefined;
    }
    const timer = setTimeout(() => setAnimState('idle'), BLOOM_MS);
    return () => clearTimeout(timer);
  }, [animState]);

  if (!editable) {
    return null;
  }

  // On one's own profile the pen is the filled, green one and leads to the
  // profile settings; it is the thing to do there.
  if (editable.context === 'profile') {
    const label = tc('menu.member.settings');
    return (
      <div className={`new-button-wrapper new-button-${animState}`}>
        <Link
          className="site-new-button"
          to="/admin/my-profile"
          aria-label={label}
          title={label}
        >
          <span className="site-new" aria-hidden>
            <PenIcon width={16} height={16} />
          </span>
        </Link>
      </div>
    );
  }

  // An admin on an organizer's page: the white pen, to that profile's
  // admin form.
  if (editable.context === 'userProfile') {
    const label = tc('people.editProfile');
    return (
      <div className={`new-button-wrapper new-button-${animState}`}>
        <Link
          className="site-new-button"
          to={`/admin/users/${encodeURIComponent(
            editable.username || ''
          )}/profile`}
          aria-label={label}
          title={label}
        >
          <span className="site-new site-edit" aria-hidden>
            <PenIcon width={16} height={16} />
          </span>
        </Link>
      </div>
    );
  }

  const label = tc('entryMenu.label');
  const open = (param: string) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set(param, 'true');
      return next;
    });

  return (
    <div className={`new-button-wrapper new-button-${animState}`}>
      <Menu
        align="end"
        ariaLabel={label}
        button={
          <span className="site-new site-edit" title={label} aria-hidden>
            <SettingsIcon width={16} height={16} />
          </span>
        }
      >
        <div className="site-info-menu">
          {gearItems.map((item) => (
            <MenuItem
              key={item.param}
              style={{ padding: 0 }}
              onClick={() => open(item.param)}
            >
              <span
                className={`site-info-menu-link ${
                  item.isDanger ? 'is-danger' : ''
                }`}
              >
                {item.label}
              </span>
            </MenuItem>
          ))}
        </div>
      </Menu>
    </div>
  );
}

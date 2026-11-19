import React, { useEffect, useState } from 'react';
import {
  useLocation,
  useMatches,
  useParams,
  useSearchParams,
} from 'react-router';
import { useTranslation } from 'react-i18next';
import SettingsIcon from 'lucide-react/dist/esm/icons/settings';
import { useAtomValue } from 'jotai';

import { parseTitle } from '/imports/api/_utils/shared';
import { isFeatureEnabled } from '/imports/api/_utils/features';
import { managesPlace } from '/imports/api/resources/placeAccess';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import { message } from '/imports/ui/generic/message';
import { displayName } from '/imports/ui/listing/UsersHybrid';
import { startViewAs } from '/imports/utils/viewAs';
import {
  canCreateContentAtom,
  currentUserAtom,
  roleAtom,
  viewAsAtom,
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
  const data = [...matches].reverse().find((match) => match.data)?.data as
    | any
    | undefined;
  // One's own profile page: anyone logged in may edit that.
  if (pathname.replace(/\/$/, '') === `/@${currentUser.username}`) {
    return { context: 'profile', id: currentUser._id, item: currentUser };
  }
  const isAdmin = role === 'admin';
  // Someone else's organizer page: an admin may edit their profile. The
  // page has no user when the profile is hidden; it can still be edited.
  const profileSlug = pathname.match(/^\/@([^/]+)\/?$/);
  if (profileSlug) {
    return isAdmin
      ? {
          context: 'userProfile',
          id: profileSlug[1],
          username: decodeURIComponent(profileSlug[1]),
          // from the /:slug route, whichever child route is shown under it
          item: matches.map((match) => (match.data as any)?.user).find(Boolean),
        }
      : null;
  }
  if (!canCreateContent) {
    return null;
  }
  const userId = currentUser._id;
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
  // The search parameter that opens the dialog for it; what is not a
  // dialog on the page has an action of its own
  param: string;
  label: string;
  isDanger?: boolean;
  action?: 'viewAs';
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
  const viewAs = useAtomValue(viewAsAtom);

  if (!editable || !currentUser) {
    return [];
  }
  const { context, item } = editable;
  const isAdmin = role === 'admin';
  // A profile: its form, which has the settings too, and (an admin on
  // someone else's page) the site as that person sees it. Admins cannot be viewed
  // as, and one borrowed session at a time.
  if (context === 'profile' || context === 'userProfile') {
    const editProfile = {
      param: 'edit',
      label: tc(`entryMenu.edit.${context}`),
    };
    if (context === 'profile') {
      return [editProfile];
    }
    const canViewAs =
      item?._id &&
      !viewAs &&
      !(item.memberships || []).some((m: any) => m.role === 'admin');
    return [
      editProfile,
      ...(canViewAs
        ? [
            {
              param: 'viewAs',
              label: tc('entryMenu.viewAs', { name: displayName(item) }),
              action: 'viewAs' as const,
            },
          ]
        : []),
    ];
  }
  if (!item) {
    return [];
  }
  // Documents are a feature
  const documentsOn = isFeatureEnabled('documents');
  const edit = { param: 'edit', label: tc(`entryMenu.edit.${context}`) };
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
    case 'resources': {
      // What it offers (Äta, handla & bo), for everyone who may change it;
      // documents and deleting stay with the admins, documents only while
      // that feature is on
      const offerings = {
        param: 'offerings',
        label: tc('entryMenu.offerings'),
      };
      const offeringsOn = isFeatureEnabled('businesses');
      return isAdmin
        ? [
            ...(documentsOn ? [addDocument] : []),
            edit,
            ...(offeringsOn ? [offerings] : []),
            remove,
          ]
        : [edit, ...(offeringsOn ? [offerings] : [])];
    }
    case 'works':
      return [...(documentsOn ? [addDocument] : []), edit, remove];
    case 'info':
      return [{ param: 'new', label: tc('entryMenu.newPage') }, edit, remove];
    default:
      return [];
  }
}

// The button in the header next to the plus on a page one may edit: a gear
// with what can be done to the event, förening, place, request, info page
// or profile shown.
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

  const label = tc('entryMenu.label');
  const open = (param: string) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set(param, 'true');
      return next;
    });

  // An admin borrows the session of the person whose page this is, and
  // stays on the page: now theirs, with their own gear
  const viewAs = async () => {
    const user = editable.item;
    try {
      await startViewAs(user._id, user.username);
      message.success(
        tc('entryMenu.viewAsStarted', { name: displayName(user) })
      );
    } catch (error: any) {
      message.error(error.reason || error.message || error.error);
    }
  };

  const select = (item: GearItem) => {
    if (item.action === 'viewAs') {
      viewAs();
    } else {
      open(item.param);
    }
  };

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
              onClick={() => select(item)}
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

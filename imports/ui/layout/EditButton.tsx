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
import { useAtomValue } from 'jotai';

import { parseTitle } from '/imports/api/_utils/shared';
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
  | 'profile';

// What the page under the header shows, taken from its route's loader data,
// and whether this visitor may edit it. Mirrors the server's own checks so
// the pen only appears where the form would be allowed to save.
function useEditable(): { context: Context; id: string } | null {
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
  if (!canCreateContent) {
    return null;
  }
  const userId = currentUser._id;
  const isAdmin = role === 'admin';
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
      ? { context: 'activities', id: activity._id }
      : null;
  }
  if (data.group?._id) {
    const { group } = data;
    const isGroupAdmin = (group.members || []).some(
      (member: any) => member.memberId === userId && member.isAdmin
    );
    return isGroupAdmin ? { context: 'groups', id: group._id } : null;
  }
  if (data.resource?._id) {
    return isAdmin ? { context: 'resources', id: data.resource._id } : null;
  }
  if (data.work?._id) {
    return data.work.authorId === userId
      ? { context: 'works', id: data.work._id }
      : null;
  }
  if (Array.isArray(data.pages) && pageTitle) {
    const page =
      data.pages.find((p: any) => parseTitle(p.title) === pageTitle) ||
      data.pages[0];
    return isAdmin && page ? { context: 'info', id: page._id } : null;
  }
  return null;
}

// The pen in the header, next to the plus: on an event, förening, place,
// request or info page the visitor may edit, it opens that page's form.
export default function EditButton() {
  const [tc] = useTranslation('common');
  const [, setSearchParams] = useSearchParams();
  const editable = useEditable();

  // A short bloom each time the pen appears for a new page.
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

  const label = tc(`labels.update.${editable.context}`, tc('actions.update'));

  return (
    <div className={`new-button-wrapper new-button-${animState}`}>
      <button
        type="button"
        className="site-new-button"
        aria-label={label}
        title={label}
        onClick={() =>
          setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.set('edit', 'true');
            return next;
          })
        }
      >
        <span className="site-new site-edit" aria-hidden>
          <PenIcon width={16} height={16} />
        </span>
      </button>
    </div>
  );
}

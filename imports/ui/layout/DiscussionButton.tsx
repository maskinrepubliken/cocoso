import React, { useEffect, useState } from 'react';
import loadable from '@loadable/component';
import { useMatches } from 'react-router';
import { useTranslation } from 'react-i18next';
import MessagesSquareIcon from 'lucide-react/dist/esm/icons/messages-square';
import { useAtomValue } from 'jotai';

import {
  canCreateContentAtom,
  currentUserAtom,
  roleAtom,
} from '/imports/state';
import { groupAtom } from '/imports/ui/pages/groups/groupAtom';
import { isFeatureEnabled } from '/imports/api/_utils/features';

// The chat pulls in browser-only styles, so it is loaded on the client.
const ChatUI = loadable(() =>
  import('/imports/ui/chattery/ChatHandler').then((m) => ({
    default: m.ChatUI,
  }))
);

const BLOOM_MS = 900;

type Context = 'activities' | 'groups' | 'resources';

// The discussion of the page under the header, taken from its route's
// loader data, when this visitor may take part in it: an event's for
// verified members, a förening's for its members, a place's for those who
// may create content.
function useDiscussion(): { context: Context; item: any } | null {
  const matches = useMatches();
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);
  // Joining or leaving updates the group here, not the loader data
  const groupItem = useAtomValue(groupAtom);

  if (!currentUser) {
    return null;
  }
  const data = [...matches].reverse().find((match) => match.data)?.data as
    | any
    | undefined;
  if (!data) {
    return null;
  }

  if (data.activity?._id) {
    return canCreateContent && data.activity.isPublicActivity
      ? { context: 'activities', item: data.activity }
      : null;
  }
  if (data.group?._id) {
    const group = groupItem?._id === data.group._id ? groupItem : data.group;
    const isMember = (group.members || []).some(
      (member: any) => member.memberId === currentUser._id
    );
    // The site's admins take part in any group's discussion too
    return isMember || role === 'admin'
      ? { context: 'groups', item: group }
      : null;
  }
  if (data.resource?._id) {
    return role === 'admin' || canCreateContent
      ? { context: 'resources', item: data.resource }
      : null;
  }
  return null;
}

// The speech bubbles in the header, next to the pen: on an event, förening
// or place page one may discuss, it opens the discussion at the side.
export default function DiscussionButton() {
  const [tc] = useTranslation('common');
  const currentUser = useAtomValue(currentUserAtom);
  const discussion = useDiscussion();
  const [open, setOpen] = useState(false);
  // The chat subscribes once it is first opened, then stays for the
  // drawer's closing slide.
  const [opened, setOpened] = useState(false);

  // A short bloom each time the button appears for a new page; a new page
  // also closes the chat of the last one.
  const [animState, setAnimState] = useState<'idle' | 'subtle'>('idle');
  const [seenId, setSeenId] = useState<string | null>(null);
  const id = discussion?.item._id || null;
  if (id !== seenId) {
    setSeenId(id);
    setOpen(false);
    setOpened(false);
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

  if (!discussion || !isFeatureEnabled('discussions')) {
    return null;
  }

  const unseen =
    (currentUser as any)?.notifications?.find(
      (n: any) => n?.contextId === discussion.item._id
    )?.unSeenIndexes?.length || 0;
  const label = tc('labels.discussion');

  return (
    <div className={`new-button-wrapper new-button-${animState}`}>
      <button
        type="button"
        className="site-new-button"
        aria-label={label}
        title={label}
        onClick={() => {
          setOpened(true);
          setOpen(true);
        }}
      >
        <span className="site-new site-edit" aria-hidden>
          <MessagesSquareIcon width={16} height={16} />
        </span>
      </button>
      {unseen > 0 && <span className="site-user-count">{unseen}</span>}

      {opened && (
        <ChatUI
          context={discussion.context}
          currentUser={currentUser as any}
          item={discussion.item}
          open={open}
          setOpen={setOpen}
          withInput
        />
      )}
    </div>
  );
}

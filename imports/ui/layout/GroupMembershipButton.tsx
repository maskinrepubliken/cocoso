import React, { useEffect, useState } from 'react';
import { Link, useMatches } from 'react-router';
import { useTranslation } from 'react-i18next';
import UserPlusIcon from 'lucide-react/dist/esm/icons/user-plus';
import UserCheckIcon from 'lucide-react/dist/esm/icons/user-check';
import { useAtom, useAtomValue } from 'jotai';

import { Modal, Text } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import { currentUserAtom } from '/imports/state';
import { groupAtom } from '/imports/ui/pages/groups/groupAtom';
import { sitePath } from '/imports/api/_utils/paths';

const BLOOM_MS = 900;

// Joining a group from the header, on its page: a green person with a plus
// for those who are not in it (logged out, it leads to the login), and for
// members a white person with a tick, whose menu has "Lämna". The group's
// admins have the gear instead and get neither.
export default function GroupMembershipButton() {
  const [t] = useTranslation('groups');
  const [tc] = useTranslation('common');
  const matches = useMatches();
  const currentUser = useAtomValue(currentUserAtom);
  // Joining or leaving updates the group here, not the loader data
  const [groupItem, setGroup] = useAtom(groupAtom);
  const [asking, setAsking] = useState<'join' | 'leave' | null>(null);
  const [loading, setLoading] = useState(false);

  const data = [...matches].reverse().find((match) => match.data)?.data as
    | any
    | undefined;
  const loaded = data?.group?._id ? data.group : null;
  const group = loaded && groupItem?._id === loaded._id ? groupItem : loaded;
  const me = currentUser
    ? group?.members?.find((m: any) => m.memberId === currentUser._id)
    : null;

  // A short bloom when the button appears for a new group
  const [animState, setAnimState] = useState<'idle' | 'subtle'>('idle');
  const [seenId, setSeenId] = useState<string | null>(null);
  const id = group?._id || null;
  if (id !== seenId) {
    setSeenId(id);
    setAsking(null);
    if (id) setAnimState('subtle');
  }
  useEffect(() => {
    if (animState === 'idle') return undefined;
    const timer = setTimeout(() => setAnimState('idle'), BLOOM_MS);
    return () => clearTimeout(timer);
  }, [animState]);

  if (!group || me?.isAdmin) {
    return null;
  }

  const change = async (method: 'joinGroup' | 'leaveGroup') => {
    setLoading(true);
    try {
      await call(method, group._id);
      setGroup(await call('getGroupWithMeetings', group._id));
      setAsking(null);
      message.success(
        t(method === 'joinGroup' ? 'message.added' : 'message.removed')
      );
    } catch (error: any) {
      message.error(error.error || error.reason);
    } finally {
      setLoading(false);
    }
  };

  const wrapper = `new-button-wrapper new-button-${animState}`;

  // Logged out: to the login, which brings one back to join
  if (!currentUser) {
    const label = tc('labels.loginToJoin');
    return (
      <div className={wrapper}>
        <Link
          className="site-new-button"
          to={sitePath('login')}
          aria-label={label}
          title={label}
        >
          <span className="site-new" aria-hidden>
            <UserPlusIcon width={16} height={16} />
          </span>
        </Link>
      </div>
    );
  }

  const modals = (
    <>
      <Modal
        confirmButtonProps={{ loading }}
        id="group-join"
        open={asking === 'join'}
        title={t('modal.join.title')}
        onConfirm={() => change('joinGroup')}
        onClose={() => setAsking(null)}
      >
        <Text>{t('modal.join.body', { title: group.title })}</Text>
      </Modal>
      <Modal
        confirmButtonProps={{ colorScheme: 'red', loading }}
        id="group-leave"
        open={asking === 'leave'}
        title={t('modal.leave.title')}
        onConfirm={() => change('leaveGroup')}
        onClose={() => setAsking(null)}
      >
        <Text>{t('modal.leave.body', { title: group.title })}</Text>
      </Modal>
    </>
  );

  if (!me) {
    const label = t('actions.join');
    return (
      <div className={wrapper}>
        <button
          type="button"
          className="site-new-button"
          aria-label={label}
          title={label}
          onClick={() => setAsking('join')}
        >
          <span className="site-new" aria-hidden>
            <UserPlusIcon width={16} height={16} />
          </span>
        </button>
        {modals}
      </div>
    );
  }

  const label = t('membership.you');
  return (
    <div className={wrapper}>
      <Menu
        align="end"
        ariaLabel={label}
        button={
          <span className="site-new site-edit" title={label} aria-hidden>
            <UserCheckIcon width={16} height={16} />
          </span>
        }
      >
        <div className="site-info-menu">
          <MenuItem style={{ padding: 0 }} onClick={() => setAsking('leave')}>
            <span className="site-info-menu-link is-danger">
              {t('membership.leave')}
            </span>
          </MenuItem>
        </div>
      </Menu>
      {modals}
    </div>
  );
}

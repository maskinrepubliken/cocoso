import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';
import TrashIcon from 'lucide-react/dist/esm/icons/trash-2';

import { styled } from '/stitches.config';
import { Button } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';
import { currentUserAtom, roleAtom } from '/imports/state';
import type { GroupMeeting } from '/imports/ui/entry/GroupMeetingList';

import { groupAtom } from '../groupAtom';

const Row = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  flexWrap: 'wrap',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  '& small': { color: 'var(--cocoso-mylla-soft)', fontSize: '0.85rem' },
});

const Bin = styled('button', {
  alignItems: 'center',
  background: 'none',
  border: 0,
  borderRadius: '999px',
  color: 'var(--cocoso-mylla-soft)',
  cursor: 'pointer',
  display: 'flex',
  height: '2.25rem',
  justifyContent: 'center',
  width: '2.25rem',
  '& svg': { height: '1.1rem', width: '1.1rem' },
  '&:hover': {
    backgroundColor: 'var(--cocoso-colors-red-50)',
    color: 'var(--cocoso-colors-red-700)',
  },
});

// Beside a meeting in the group's list: for its members a button to come
// or not; for the group's owners (and the site's admins) how many are
// coming and a bin that asks once more before the meeting goes.
export default function MeetingActions({ meeting }: { meeting: GroupMeeting }) {
  const [t] = useTranslation('groups');
  const [tc] = useTranslation('common');
  const currentUser = useAtomValue(currentUserAtom) as any;
  const role = useAtomValue(roleAtom);
  const [group, setGroup] = useAtom(groupAtom) as [any, (g: any) => void];
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!group || !currentUser || !meeting.meetingId) {
    return null;
  }
  const me = group.members?.find((m: any) => m.memberId === currentUser._id);
  const isOwner = Boolean(me?.isAdmin) || role === 'admin';
  const attendees = (meeting as any).attendees || [];
  const isComing = attendees.some(
    (a: any) => a?.username === currentUser.username
  );

  const refresh = async () =>
    setGroup(await call('getGroupWithMeetings', group._id));

  const remove = async () => {
    setBusy(true);
    try {
      await call('deleteActivity', meeting.meetingId);
      await refresh();
      message.success(t('meeting.success.remove'));
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

  const toggleComing = async () => {
    setBusy(true);
    const email = currentUser.emails?.[0]?.address;
    try {
      if (isComing) {
        await call(
          'removeAttendance',
          meeting.meetingId,
          0,
          email,
          currentUser.lastName || ''
        );
        message.success(t('meeting.attends.remove'));
      } else {
        await call('registerAttendance', meeting.meetingId, {
          email,
          username: currentUser.username,
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          numberOfPeople: 1,
        });
        message.success(t('meeting.attends.register'));
      }
      await refresh();
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setBusy(false);
    }
  };

  if (isOwner) {
    return (
      <Row>
        <small>{t('meetingList.coming', { count: attendees.length })}</small>
        {asking ? (
          <>
            <Button colorScheme="red" loading={busy} size="sm" onClick={remove}>
              {tc('actions.remove')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
              {tc('actions.cancel')}
            </Button>
          </>
        ) : (
          <Bin
            aria-label={t('meetingList.remove', {
              name: meeting.meetingTitle || group.title,
            })}
            title={t('meetingList.remove', {
              name: meeting.meetingTitle || group.title,
            })}
            type="button"
            onClick={() => setAsking(true)}
          >
            <TrashIcon aria-hidden />
          </Bin>
        )}
      </Row>
    );
  }

  if (!me) {
    return null;
  }
  return (
    <Row>
      <Button
        loading={busy}
        size="sm"
        variant={isComing ? 'outline' : undefined}
        onClick={toggleComing}
      >
        {isComing ? t('meetingList.notComing') : t('meetingList.come')}
      </Button>
    </Row>
  );
}

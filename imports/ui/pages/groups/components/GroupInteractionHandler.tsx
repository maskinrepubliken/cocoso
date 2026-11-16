import React from 'react';
import { useAtomValue } from 'jotai';

import { currentUserAtom } from '/imports/state';
import { EntryActions } from '/imports/ui/entry/EntryHero';

import GroupMeetingDates from './GroupMeetingDates';
import GroupJoinButton from './GroupJoinButton';
import GroupLeaveButton from './GroupLeaveButton';
import GroupAdminFunctions from './GroupAdminFunctions';
import { groupAtom } from '../GroupItemHandler';

export default function GroupInteractionHandler() {
  const currentUser = useAtomValue(currentUserAtom);
  const group = useAtomValue(groupAtom);

  if (!group) {
    return null;
  }

  const isMember =
    currentUser &&
    group.members?.some((member) => member.memberId === currentUser._id);

  const isAdmin =
    isMember &&
    group.members?.some(
      (member) => member.memberId === currentUser._id && member.isAdmin
    );

  const memberProps = { currentUser, group, isAdmin, isMember };

  if (isAdmin) {
    return (
      <EntryActions>
        <GroupAdminFunctions />
        <GroupMeetingDates {...memberProps} />
      </EntryActions>
    );
  }

  if (isMember) {
    return (
      <EntryActions>
        <GroupMeetingDates {...memberProps} />
        <GroupLeaveButton />
      </EntryActions>
    );
  }

  return (
    <EntryActions>
      <GroupJoinButton />
      <GroupMeetingDates {...memberProps} />
    </EntryActions>
  );
}

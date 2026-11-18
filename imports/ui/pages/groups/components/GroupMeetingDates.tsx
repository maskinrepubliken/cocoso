import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';

import {
  Accordion,
  Box,
  Button,
  Center,
  List,
  ListItem,
  Modal,
  Text,
} from '/imports/ui/core';

import FancyDate from '/imports/ui/entry/FancyDate';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import { currentUserAtom, roleAtom } from '/imports/state';

import { groupAtom } from '../groupAtom';

const yesterday = dayjs(new Date()).add(-1, 'days');
const isFutureMeeting = (meeting) => dayjs(meeting.endDate).isAfter(yesterday);

function MeetingDatesContent({
  currentUser,
  group,
  isAdmin,
  isMember,
  onClose,
}) {
  const [regButtonDisabled, setRegButtonDisabled] = useState(false);
  const [delButtonDisabled, setDelButtonDisabled] = useState(false);
  const setGroup = useSetAtom(groupAtom);
  const [t] = useTranslation('groups');

  if (!group) {
    return null;
  }

  const toggleAttendance = async (activityId, meetingIndex) => {
    if (!currentUser) {
      message.error(t('meeting.access.logged'));
      return;
    }
    if (!isMember) {
      message.error(t('meeting.access.join'));
      return;
    }

    if (!group.meetings || group.meetings.length < 1) {
      return;
    }

    setRegButtonDisabled(true);

    const isAttending = group.meetings[meetingIndex].attendees
      ?.map((attendee) => attendee.username)
      ?.includes(currentUser.username);

    const meetingAttendee = {
      email: currentUser.emails[0].address,
      username: currentUser.username,
      firstName: currentUser.firstName || '',
      lastName: currentUser.lastName || '',
      numberOfPeople: 1,
    };

    try {
      const groupId = group._id;
      if (isAttending) {
        await call(
          'removeAttendance',
          activityId,
          0,
          meetingAttendee.email,
          meetingAttendee.lastName
        );
        setGroup(await call('getGroupWithMeetings', groupId));
        setRegButtonDisabled(false);
        message.success(t('meeting.attends.remove'));
        onClose();
      } else {
        await call('registerAttendance', activityId, meetingAttendee);
        setGroup(await call('getGroupWithMeetings', groupId));
        setRegButtonDisabled(false);
        message.success(t('meeting.attends.register'));
        onClose();
      }
    } catch (error) {
      message.error(error.error || error.reason);
    }
  };

  const deleteActivity = async (activityId) => {
    if (!isAdmin || !group) {
      message.error(t('meeting.access.remove'));
      return;
    }

    setDelButtonDisabled(true);

    try {
      await call('deleteActivity', activityId);
      setGroup(await call('getGroupWithMeetings', group._id));
      setDelButtonDisabled(false);
      message.success(t('meeting.success.remove'));
    } catch (error) {
      message.error(error.error);
    } finally {
      setDelButtonDisabled(false);
    }
  };

  const getAccordionOptions = () => {
    return group.meetings
      ?.filter((m) => isFutureMeeting(m))
      .map((meeting, meetingIndex) => {
        const isAttending =
          currentUser &&
          meeting.attendees &&
          meeting.attendees
            .map((attendee) => attendee.username)
            .includes(currentUser.username);
        return {
          key: meeting.meetingId,
          header: <FancyDate occurrence={meeting} />,
          content: isAdmin ? (
            <Box>
              <Text fontWeight="bold" mt="1">
                {t('labels.attendees')}
              </Text>
              <List>
                {meeting?.attendees?.map(
                  (attendee) =>
                    attendee && (
                      <ListItem key={attendee.username} mt="2">
                        <Text as="span" fontWeight="bold">
                          {attendee.username}
                        </Text>
                        {(attendee.firstName || attendee.lastName) && (
                          <Text as="span">{` (${attendee.firstName} ${attendee.lastName})`}</Text>
                        )}
                      </ListItem>
                    )
                )}
              </List>

              <Center py="2" mt="2">
                <Button
                  colorScheme="red"
                  loading={delButtonDisabled}
                  size="xs"
                  variant="outline"
                  onClick={() => deleteActivity(meeting.meetingId)}
                >
                  {t('meeting.actions.remove')}
                </Button>
              </Center>
            </Box>
          ) : (
            <Center p="2">
              <Button
                size="sm"
                colorScheme={isAttending ? 'red' : 'green'}
                loading={regButtonDisabled}
                onClick={() =>
                  toggleAttendance(meeting.meetingId, meetingIndex)
                }
              >
                {isAttending
                  ? t('meeting.isAttending.false')
                  : t('meeting.isAttending.true')}
              </Button>
            </Center>
          ),
        };
      });
  };

  return <Accordion options={getAccordionOptions()} />;
}

// Beside the heading of a group's meetings, for its members: a button to
// the meetings, where a member signs up for them and an admin sees who is
// coming and removes a meeting. Others see the dates in the section itself.
export default function GroupMeetingDates() {
  const [modalOpen, setModalOpen] = useState(false);
  const [t] = useTranslation('groups');
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const group = useAtomValue(groupAtom) as any;

  const me = currentUser
    ? group?.members?.find((m: any) => m.memberId === currentUser._id)
    : null;
  const hasUpcoming = Boolean(group?.meetings?.some(isFutureMeeting));
  // The site's admins manage any group's meetings, member or not
  const isAdmin = Boolean(me?.isAdmin) || role === 'admin';

  if (!group || (!me && !isAdmin) || !hasUpcoming) {
    return null;
  }

  const props = { currentUser, group, isAdmin, isMember: true };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
        {t(isAdmin ? 'membership.manage' : 'membership.attend')}
      </Button>

      <Modal
        hideFooter
        id="group-meeting-dates"
        open={modalOpen}
        title={t('labels.meetings')}
        onClose={() => setModalOpen(false)}
      >
        {!isAdmin && (
          <Text mb="4" textAlign="center">
            {t('meeting.info.member')}
          </Text>
        )}
        <MeetingDatesContent {...props} onClose={() => setModalOpen(false)} />
      </Modal>
    </>
  );
}

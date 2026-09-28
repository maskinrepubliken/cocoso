import React, { useState } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAtomValue, useSetAtom } from 'jotai';

import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Input,
  Modal,
  Text,
} from '/imports/ui/core';
import { currentUserAtom, roleAtom } from '/imports/state';
import FancyDate from '/imports/ui/entry/FancyDate';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';
import FormField from '/imports/ui/forms/FormField';

import AttendeeNames from './AttendeeNames';
import RsvpForm from './RsvpForm';
import RsvpList from './CsvList';
import { activityAtom } from '../ActivityItemHandler';

const yesterday = dayjs(new Date()).add(-1, 'days');

const getAttendeeCount = (attendees) => {
  let count = 0;
  attendees.forEach((att) => {
    count += att.numberOfPeople;
  });
  return count;
};

export default function RsvpContent({
  activity,
  occurrence,
  occurrenceIndex,
  onCloseModal,
}) {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const setActivity = useSetAtom(activityAtom);
  const { activityId } = useParams();
  const [state, setState] = useState<{
    isRsvpCancelModalOn: boolean;
    rsvpCancelModalInfo: any;
    selectedOccurrence: any;
  }>({
    isRsvpCancelModalOn: false,
    rsvpCancelModalInfo: null,
    selectedOccurrence: null,
  });
  const [capacityGotFullByYou] = useState(false);
  const [t] = useTranslation('activities');

  const { isRsvpCancelModalOn, rsvpCancelModalInfo, selectedOccurrence } =
    state;

  if (!activity || !occurrence || !occurrence.attendees) {
    return null;
  }

  const { capacity } = activity;

  const getTotalNumber = () => {
    let counter = 0;
    occurrence.attendees.forEach((attendee) => {
      counter += Number(attendee.numberOfPeople);
    });
    return counter;
  };

  const resetRsvpModal = () => {
    setState({
      ...state,
      isRsvpCancelModalOn: false,
      rsvpCancelModalInfo: null,
    });
    onCloseModal();
  };

  const openCancelRsvpModal = () => {
    setState({
      ...state,
      isRsvpCancelModalOn: true,
      rsvpCancelModalInfo: {
        occurrenceIndex,
        email: currentUser ? currentUser.emails[0].address : '',
        lastName:
          currentUser && currentUser.lastName ? currentUser.lastName : '',
      },
    });
  };

  // The server decides on duplicates and capacity; attendees' emails are
  // not sent to the browser, so they cannot be checked here.
  const showRsvpError = (error: any) => {
    if (error?.error === 'already-registered') {
      message.error(t('public.register.alreadyRegistered'));
    } else if (error?.error === 'capacity-full') {
      message.error(t('public.capacity.full'));
    } else {
      message.error(error?.reason);
    }
  };

  const handleRsvpSubmit = async (values) => {
    const numberOfPeople = Number(values.numberOfPeople);

    const parsedValues = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      numberOfPeople,
      isNameHidden: Boolean(values.isNameHidden),
    };

    try {
      await call(
        'registerAttendance',
        activity?._id,
        parsedValues,
        occurrenceIndex
      );
      setActivity(await call('getActivityById', activityId));
      resetRsvpModal();
      message.success(t('public.attendance.create'));
    } catch (error) {
      showRsvpError(error);
    }
  };

  const handleChangeRsvpSubmit = async (values) => {
    const numberOfPeople = Number(values.numberOfPeople);

    const parsedValues = {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      numberOfPeople,
      isNameHidden: Boolean(values.isNameHidden),
    };

    try {
      await call(
        'updateAttendance',
        activity?._id,
        parsedValues,
        rsvpCancelModalInfo?.occurrenceIndex,
        rsvpCancelModalInfo?.attendeeIndex,
        rsvpCancelModalInfo?.current
      );
      setActivity(await call('getActivityById', activityId));
      resetRsvpModal();
      message.success(t('public.attendance.update'));
    } catch (error) {
      showRsvpError(error);
    }
  };

  const handleRemoveRsvp = async () => {
    if (!rsvpCancelModalInfo) {
      return;
    }
    const { email, lastName } = rsvpCancelModalInfo.current || {};

    if (!email || !lastName) {
      return;
    }

    try {
      await call(
        'removeAttendance',
        activity?._id,
        occurrenceIndex,
        email,
        lastName
      );
      setActivity(await call('getActivityById', activityId));
      resetRsvpModal();
      message.success(t('public.attendance.remove'));
      setState({
        ...state,
        rsvpCancelModalInfo: null,
        isRsvpCancelModalOn: false,
      });
    } catch (error) {
      message.error(error.reason);
    }
  };

  const findRsvpInfo = async () => {
    const { email, lastName } = rsvpCancelModalInfo;
    try {
      const found = await call<{ email: string; lastName: string }>(
        'findAttendance',
        activity?._id,
        rsvpCancelModalInfo.occurrenceIndex,
        email || '',
        lastName || ''
      );
      setState({
        ...state,
        rsvpCancelModalInfo: {
          ...rsvpCancelModalInfo,
          ...found,
          current: { email: found.email, lastName: found.lastName },
          isInfoFound: true,
        },
      });
    } catch (_error) {
      message.error(t('public.register.notFound'));
    }
  };

  const defaultRsvpValues = {
    firstName: currentUser ? currentUser.firstName : '',
    lastName: currentUser ? currentUser.lastName : '',
    email: currentUser ? currentUser.emails[0].address : '',
    numberOfPeople: 1,
    isNameHidden: false,
  };

  const canSeeAttendeeDetails =
    role === 'admin' ||
    (currentUser && currentUser.username === activity.authorName);

  const eventPast = dayjs(occurrence.endDate).isBefore(yesterday);

  return (
    <Box>
      <Box>
        {!eventPast && (
          <Center m="2">
            <Button
              colorScheme="red"
              size="sm"
              variant="ghost"
              onClick={() => openCancelRsvpModal(occurrenceIndex)}
            >
              {t('public.cancel.label')}
            </Button>
          </Center>
        )}

        {eventPast ? (
          <Box py="2">
            <Text color="gray.800">{t('public.past')}</Text>
          </Box>
        ) : capacity && occurrence.attendees && getTotalNumber() >= capacity ? (
          <p>
            {capacityGotFullByYou && t('public.capacity.fullByYou')}
            {t('public.capacity.full')}
          </p>
        ) : (
          <RsvpForm
            defaultValues={defaultRsvpValues}
            onSubmit={(values) => handleRsvpSubmit(values, occurrenceIndex)}
          />
        )}
      </Box>

      {activity.isPublicActivity && (
        <Box mb="4">
          <AttendeeNames attendees={occurrence.attendees} />
        </Box>
      )}

      {canSeeAttendeeDetails && (
        <Center>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setState({ ...state, selectedOccurrence: occurrence })
            }
          >
            {t('public.attendance.show')}
          </Button>
        </Center>
      )}

      <Modal
        hideFooter
        id="occurrence-rsvp-content"
        open={isRsvpCancelModalOn}
        size="lg"
        title={
          rsvpCancelModalInfo && rsvpCancelModalInfo.isInfoFound
            ? t('public.cancel.found')
            : t('public.cancel.notFound')
        }
        onClose={() => setState({ ...state, isRsvpCancelModalOn: false })}
      >
        {rsvpCancelModalInfo?.isInfoFound ? (
          <RsvpForm
            isUpdateMode
            onDelete={handleRemoveRsvp}
            defaultValues={rsvpCancelModalInfo}
            onSubmit={(values) => handleChangeRsvpSubmit(values)}
          />
        ) : (
          <Box>
            <FormField label={t('public.register.form.name.last')}>
              <Input
                value={rsvpCancelModalInfo && rsvpCancelModalInfo.lastName}
                onChange={(e) =>
                  setState({
                    ...state,
                    rsvpCancelModalInfo: {
                      ...rsvpCancelModalInfo,
                      lastName: e.target.value,
                    },
                  })
                }
              />
            </FormField>

            <FormField label={t('public.register.form.email')}>
              <Input
                value={rsvpCancelModalInfo && rsvpCancelModalInfo.email}
                onChange={(e) =>
                  setState({
                    ...state,
                    rsvpCancelModalInfo: {
                      ...rsvpCancelModalInfo,
                      email: e.target.value,
                    },
                  })
                }
              />
            </FormField>

            <Flex justify="flex-end" pt="6">
              <Button onClick={findRsvpInfo}>Confirm</Button>
            </Flex>
          </Box>
        )}
      </Modal>

      <Modal
        hideFooter
        id="occurrence-rsvp-content-found-result"
        open={Boolean(selectedOccurrence)}
        size="2xl"
        title={
          <Box mr="8" w="100%">
            <FancyDate occurrence={selectedOccurrence} />
          </Box>
        }
        onClose={() => setState({ ...state, selectedOccurrence: null })}
      >
        <Heading as="h3" mb="2" size="md">
          {t('public.attendance.label')}
          {selectedOccurrence
            ? ` (${getAttendeeCount(selectedOccurrence.attendees)})`
            : null}
        </Heading>
        <Box bg="white" p="2">
          <RsvpList occurrence={selectedOccurrence} title={activity?.title} />
        </Box>
      </Modal>
    </Box>
  );
}

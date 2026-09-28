import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Link as CLink,
  Text,
} from '/imports/ui/core';
import Modal from '/imports/ui/core/Modal';
import { call } from '/imports/api/_utils/shared';
import { currentUserAtom } from '/imports/state';
import { message } from '/imports/ui/generic/message';
import AttendeeNames from '/imports/ui/pages/activities/components/AttendeeNames';

// One occurrence as the calendar hands it over.
export interface CalendarEntry {
  activityId: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  resourceId?: string;
  resource?: string;
  authorName: string;
  groupId?: string;
  isGroupMeeting?: boolean;
  isPublicActivity?: boolean;
  isGroupPrivate?: boolean;
  longDescription?: string;
}

interface CalendarEntryModalProps {
  entry: CalendarEntry | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const maxDescriptionLength = 240;
const block = { display: 'block' };

const shortText = (html?: string) => {
  if (!html || typeof DOMParser === 'undefined') {
    return '';
  }
  const text = (
    new DOMParser().parseFromString(html, 'text/html').body.textContent || ''
  )
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxDescriptionLength
    ? `${text.slice(0, maxDescriptionLength).trimEnd()}…`
    : text;
};

const getTimes = (entry: CalendarEntry) => {
  if (entry.startDate === entry.endDate) {
    return `${dayjs(entry.startDate).format('dddd D MMMM')}, ${
      entry.startTime
    }–${entry.endTime}`;
  }
  return `${dayjs(entry.startDate).format('D MMM')} ${
    entry.startTime
  } – ${dayjs(entry.endDate).format('D MMM')} ${entry.endTime}`;
};

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  isNameHidden: false,
};

// What opens when an event in the calendar is clicked: the essentials, who
// is coming, and a single row to sign up for that occurrence.
export default function CalendarEntryModal({
  entry,
  canEdit,
  onClose,
  onEdit,
}: CalendarEntryModalProps) {
  const [t] = useTranslation('activities');
  const [tc] = useTranslation('common');
  const currentUser = useAtomValue(currentUserAtom);
  const [activity, setActivity] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActivity(null);
    if (!entry) {
      return;
    }
    setForm({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.emails?.[0]?.address || '',
      isNameHidden: false,
    });
    if (entry.isGroupMeeting) {
      return;
    }
    call('getActivityById', entry.activityId)
      .then(setActivity)
      .catch(() => setActivity(null));
  }, [entry?.activityId, entry?.startDate, entry?.startTime]);

  if (!entry) {
    return null;
  }

  const occurrenceIndex =
    activity?.datesAndTimes?.findIndex(
      (d: any) =>
        d.startDate === entry.startDate &&
        d.startTime === entry.startTime &&
        d.endDate === entry.endDate &&
        d.endTime === entry.endTime
    ) ?? -1;
  const occurrence =
    occurrenceIndex > -1 ? activity.datesAndTimes[occurrenceIndex] : null;

  const attendeeCount = (occurrence?.attendees || []).reduce(
    (sum: number, a: any) => sum + (Number(a.numberOfPeople) || 1),
    0
  );
  const isFull = activity?.capacity && attendeeCount >= activity.capacity;
  const isPast = dayjs(entry.endDate).isBefore(dayjs(), 'day');
  const canRegister =
    Boolean(occurrence) &&
    entry.isPublicActivity &&
    !activity.isRegistrationDisabled &&
    !isPast;

  const entryPath = entry.isGroupMeeting
    ? `/groups/${entry.groupId}`
    : `/${entry.isPublicActivity ? 'activities' : 'calendar'}/${
        entry.activityId
      }`;

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await call(
        'registerAttendance',
        entry.activityId,
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          numberOfPeople: 1,
          isNameHidden: form.isNameHidden,
        },
        occurrenceIndex
      );
      setActivity(await call('getActivityById', entry.activityId));
      setForm(emptyForm);
      message.success(t('public.attendance.create'));
    } catch (error: any) {
      if (error?.error === 'already-registered') {
        message.error(t('public.register.alreadyRegistered'));
      } else if (error?.error === 'capacity-full') {
        message.error(t('public.capacity.full'));
      } else {
        message.error(error?.reason || error?.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [name]: e.target.value });

  return (
    <Modal
      hideFooter
      id="calendar-item"
      open
      size="lg"
      title={entry.title}
      onClose={onClose}
    >
      <Box bg="theme.50" p="3" mb="3">
        <Text css={block} fontWeight="bold">
          {getTimes(entry)}
        </Text>
        {entry.resource && (
          <Text css={block}>
            <Link to={`/resources/${entry.resourceId}`}>
              <CLink as="span">{entry.resource}</CLink>
            </Link>
          </Text>
        )}
        <Text css={block} fontSize="sm">
          {t('public.labels.organizer')}{' '}
          <Link to={`/@${entry.authorName}`}>
            <CLink as="span">{entry.authorName}</CLink>
          </Link>
        </Text>
      </Box>

      {!entry.isGroupPrivate && shortText(entry.longDescription) && (
        <Text css={block} fontSize="sm" mb="3">
          {shortText(entry.longDescription)}
        </Text>
      )}

      {occurrence && entry.isPublicActivity && (
        <Box mb="3">
          <AttendeeNames attendees={occurrence.attendees} />
        </Box>
      )}

      {canRegister && isFull && (
        <Text css={block} fontSize="sm" mb="3">
          {t('public.capacity.full')}
        </Text>
      )}

      {canRegister && !isFull && (
        <form onSubmit={handleRegister}>
          <Flex align="flex-end" gap="2" wrap="wrap">
            <Input
              aria-label={t('public.register.form.name.first')}
              placeholder={t('public.register.form.name.first')}
              required
              size="sm"
              style={{ flex: '1 1 8rem' }}
              value={form.firstName}
              onChange={setField('firstName')}
            />
            <Input
              aria-label={t('public.register.form.name.last')}
              placeholder={t('public.register.form.name.last')}
              required
              size="sm"
              style={{ flex: '1 1 8rem' }}
              value={form.lastName}
              onChange={setField('lastName')}
            />
            <Input
              aria-label={t('public.register.form.email')}
              placeholder={t('public.register.form.email')}
              required
              size="sm"
              style={{ flex: '2 1 12rem' }}
              type="email"
              value={form.email}
              onChange={setField('email')}
            />
            <Button loading={submitting} size="sm" type="submit">
              {t('public.register.form.actions.create')}
            </Button>
          </Flex>
          <Flex align="center" justify="space-between" mt="2" wrap="wrap">
            <Checkbox
              id="calendar-entry-hide-name"
              checked={form.isNameHidden}
              size="sm"
              onChange={(e) =>
                setForm({ ...form, isNameHidden: e.target.checked })
              }
            >
              <Text css={block} fontSize="sm">
                {t('public.register.form.hideName')}
              </Text>
            </Checkbox>
            <Text css={block} fontSize="xs" color="gray.600">
              {t('public.register.form.emailPrivate')}
            </Text>
          </Flex>
        </form>
      )}

      <Flex justify="space-between" mt="4" wrap="wrap">
        <Link to={entryPath}>
          <CLink as="span" fontSize="sm">
            {t('public.labels.readMore')}
          </CLink>
        </Link>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            {tc('actions.update')}
          </Button>
        )}
      </Flex>
    </Modal>
  );
}

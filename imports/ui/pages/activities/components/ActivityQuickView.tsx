import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import {
  Box,
  Button,
  Center,
  Checkbox,
  Flex,
  Input,
  Loader,
  Text,
} from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { currentUserAtom } from '/imports/state';
import { message } from '/imports/ui/generic/message';
import type { User } from '/imports/ui/types';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

import AttendeeNames from './AttendeeNames';

export interface OccurrenceTimes {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface ActivityQuickViewProps {
  activityId: string;
  // The occurrence to open on, e.g. the one clicked in the calendar.
  // Without it the next upcoming occurrence is chosen.
  initialOccurrence?: OccurrenceTimes | null;
  onEdit?: () => void;
}

const maxDescriptionLength = 240;
const maxDateChoices = 12;
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

const getTimes = (o: OccurrenceTimes) => {
  if (o.startDate === o.endDate) {
    return `${dayjs(o.startDate).format('dddd D MMMM')}, ${o.startTime}–${
      o.endTime
    }`;
  }
  return `${dayjs(o.startDate).format('D MMM')} ${o.startTime} – ${dayjs(
    o.endDate
  ).format('D MMM')} ${o.endTime}`;
};

const sameOccurrence = (a: OccurrenceTimes, b: OccurrenceTimes) =>
  a.startDate === b.startDate &&
  a.startTime === b.startTime &&
  a.endDate === b.endDate &&
  a.endTime === b.endTime;

const today = () => dayjs().format('YYYY-MM-DD');

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  isNameHidden: false,
};

// The short version of an event: when and where, who organizes it, a few
// lines of description, who is coming, and one row to sign up. Used by the
// popups on the front page and in the calendar.
export default function ActivityQuickView({
  activityId,
  initialOccurrence,
  onEdit,
}: ActivityQuickViewProps) {
  const [t] = useTranslation('activities');
  const [tc] = useTranslation('common');
  const prefix = useLocationPrefix();
  // Profile names live on the user document itself, not under `profile`.
  const currentUser = useAtomValue(currentUserAtom) as
    | (User & { firstName?: string; lastName?: string })
    | null;
  const [activity, setActivity] = useState<any>(null);
  const [occurrenceIndex, setOccurrenceIndex] = useState(-1);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setActivity(null);
    setForm({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.emails?.[0]?.address || '',
      isNameHidden: false,
    });
    call('getActivityById', activityId)
      .then((fetched: any) => {
        if (cancelled) return;
        const dates: OccurrenceTimes[] = fetched?.datesAndTimes || [];
        let index = initialOccurrence
          ? dates.findIndex((d) => sameOccurrence(d, initialOccurrence))
          : -1;
        if (index < 0) {
          index = dates.findIndex((d) => d.endDate >= today());
        }
        if (index < 0) {
          index = dates.length - 1;
        }
        setOccurrenceIndex(index);
        setActivity(fetched);
      })
      .catch(() => !cancelled && setActivity(null));
    return () => {
      cancelled = true;
    };
  }, [activityId, initialOccurrence?.startDate, initialOccurrence?.startTime]);

  if (!activity) {
    return (
      <Center p="4">
        <Loader />
      </Center>
    );
  }

  const dates: OccurrenceTimes[] = activity.datesAndTimes || [];
  const occurrence: any = dates[occurrenceIndex] || null;

  // Recurring events: offer the coming dates to choose between.
  const upcoming = dates
    .map((d, index) => ({ ...d, index }))
    .filter((d) => d.endDate >= today() || d.index === occurrenceIndex)
    .slice(0, maxDateChoices);

  const attendeeCount = (occurrence?.attendees || []).reduce(
    (sum: number, a: any) => sum + (Number(a.numberOfPeople) || 1),
    0
  );
  const isFull = Boolean(
    activity.capacity && attendeeCount >= activity.capacity
  );
  const isPast = occurrence
    ? dayjs(occurrence.endDate).isBefore(dayjs(), 'day')
    : true;
  const isPublic = Boolean(activity.isPublicActivity);
  const canRegister =
    Boolean(occurrence) && isPublic && !activity.isRegistrationDisabled;

  const entryPath = activity.isGroupMeeting
    ? `${prefix}/groups/${activity.groupId}`
    : `${prefix}/${isPublic ? 'activities' : 'calendar'}/${activity._id}`;

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await call(
        'registerAttendance',
        activity._id,
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          numberOfPeople: 1,
          isNameHidden: form.isNameHidden,
        },
        occurrenceIndex
      );
      setActivity(await call('getActivityById', activity._id));
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

  const description = activity.isGroupPrivate
    ? ''
    : shortText(activity.longDescription);

  return (
    <Box>
      {upcoming.length > 1 && (
        <Flex gap="1" mb="3" wrap="wrap">
          {upcoming.map((d) => (
            <Button
              key={d.index}
              size="sm"
              variant={d.index === occurrenceIndex ? 'solid' : 'outline'}
              onClick={() => setOccurrenceIndex(d.index)}
            >
              {dayjs(d.startDate).format('D MMM')}
            </Button>
          ))}
        </Flex>
      )}

      <Box bg="theme.50" p="3" mb="3">
        {occurrence && (
          <Text css={block} fontWeight="bold">
            {getTimes(occurrence)}
          </Text>
        )}
        {activity.resource ? (
          <Text css={block}>
            <Link to={`/resources/${activity.resourceId}`}>
              <Text color="blue.500">{activity.resource}</Text>
            </Link>
          </Text>
        ) : (
          (activity.place || activity.address) && (
            <Text css={block}>
              {[activity.place, activity.address].filter(Boolean).join(', ')}
            </Text>
          )
        )}
        <Text css={block} fontSize="sm">
          {t('public.labels.organizer')}{' '}
          <Link to={`/@${activity.authorName}`}>
            <Text color="blue.500">{activity.authorName}</Text>
          </Link>
        </Text>
      </Box>

      {description && (
        <Box mb="3">
          <Text css={block} fontSize="sm">
            {description}
          </Text>
        </Box>
      )}

      {occurrence && isPublic && (
        <Box mb="3">
          <AttendeeNames attendees={occurrence.attendees} />
        </Box>
      )}

      {canRegister && isPast && (
        <Box mb="3">
          <Text css={block} fontSize="sm" color="gray.600">
            {t('public.past')}
          </Text>
        </Box>
      )}

      {canRegister && !isPast && isFull && (
        <Box mb="3">
          <Text css={block} fontSize="sm">
            {t('public.capacity.full')}
          </Text>
        </Box>
      )}

      {canRegister && !isPast && !isFull && (
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
              id={`quick-hide-name-${activity._id}`}
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
          <Text color="blue.500" fontSize="sm">
            {t('public.labels.readMore')}
          </Text>
        </Link>
        {onEdit && (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            {tc('actions.update')}
          </Button>
        )}
      </Flex>
    </Box>
  );
}

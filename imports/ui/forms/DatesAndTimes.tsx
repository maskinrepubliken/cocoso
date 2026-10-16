import React, { useEffect } from 'react';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import XIcon from 'lucide-react/dist/esm/icons/x';
import TriangleAlertIcon from 'lucide-react/dist/esm/icons/triangle-alert';
import { useTranslation } from 'react-i18next';

import { Box, Text } from '/imports/ui/core';
import type { DateAndTime } from '/imports/ui/types';

import { call } from '../../api/_utils/shared';

const today = new Date().toISOString().substring(0, 10);

export type { DateAndTime };

export const emptyDateAndTime: DateAndTime = {
  startDate: today,
  endDate: today,
  startTime: '08:00',
  endTime: '10:00',
  attendees: [],
  isRange: false,
  conflict: null,
};

interface ConflictMarkerProps {
  occurrence: any;
  t: (key: string) => string;
}

export function ConflictMarker({ occurrence, t }: ConflictMarkerProps) {
  if (!occurrence) {
    return null;
  }

  return (
    <Box>
      <Text
        color="red.600"
        fontSize="sm"
        fontWeight="bold"
        my="4"
        textAlign="center"
      >
        {t('form.conflict.alert')}
        <br />
      </Text>
      {/* <Code
        colorScheme={occurrence.isConflictHard ? 'tomato' : 'orange'}
        mx="auto"
        display="block"
        width="fit-content"
        mt="4"
      >
        {occurrence.conflict.startDate === occurrence.conflict.endDate
          ? occurrence.conflict.startDate
          : `${occurrence.conflict.startDate}-${occurrence.conflict.endDate}`}
        {', '}
        {`${occurrence.conflict.startTime} – ${occurrence.conflict.endTime}`}
      </Code> */}
      {!occurrence.isConflictHard && (
        <Text fontSize="sm" fontWeight="bold" mt="2" textAlign="center">
          {t('form.conflict.notExclusiveInfo')}
        </Text>
      )}
    </Box>
  );
}

// Times as minutes of the day, and back
const toMinutes = (time?: string) => {
  const [h, m] = String(time || '0:0')
    .split(':')
    .map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toTime = (minutes: number) => {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 55));
  return [Math.floor(clamped / 60), clamped % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
};

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
};

const isRangeOf = (o: DateAndTime) =>
  Boolean(o?.isRange || o?.startDate !== o?.endDate);

interface DatesAndTimesProps {
  activityId?: string;
  datesAndTimes: DateAndTime[];
  isExclusiveActivity?: boolean;
  resourceId?: string;
  onDatesAndTimesChange: (datesAndTimes: DateAndTime[]) => void;
}

// When the event happens: one card per occasion (tillfälle) with its date,
// or dates, and its times, in the browser's own pickers; another occasion
// starts a week after the last, at the same times.
export default function DatesAndTimes({
  activityId,
  datesAndTimes,
  isExclusiveActivity,
  resourceId,
  onDatesAndTimesChange,
}: DatesAndTimesProps) {
  const [t, i18n] = useTranslation('activities');

  const withConflict = async (occurrence: DateAndTime) => {
    if (!resourceId) {
      return { ...occurrence, conflict: null, isConflictHard: false };
    }
    const conflict = await call(
      'checkDatesForConflict',
      { ...occurrence, resourceId },
      activityId
    );
    return {
      ...occurrence,
      conflict,
      isConflictHard: Boolean(
        conflict && (isExclusiveActivity || conflict?.isExclusiveActivity)
      ),
    };
  };

  useEffect(() => {
    if (!resourceId || !datesAndTimes) {
      return;
    }
    Promise.all(datesAndTimes.map(withConflict)).then(onDatesAndTimesChange);
  }, [resourceId, isExclusiveActivity]);

  // The change shows at once; a clash with another booking follows.
  const change = (index: number, patch: Partial<DateAndTime>) => {
    const occurrence = { ...datesAndTimes[index], ...patch };
    const next = datesAndTimes.map((item, i) =>
      i === index ? occurrence : item
    );
    onDatesAndTimesChange(next);
    if (resourceId) {
      withConflict(occurrence).then((checked) =>
        onDatesAndTimesChange(
          next.map((item, i) => (i === index ? checked : item))
        )
      );
    }
  };

  const setStartDate = (index: number, startDate: string) => {
    if (!startDate) {
      return;
    }
    const o = datesAndTimes[index];
    const endDate = !isRangeOf(o)
      ? startDate
      : o.endDate < startDate
      ? startDate
      : o.endDate;
    change(index, { startDate, endDate });
  };

  // A start moved past the end takes the end along, keeping the length
  const setStartTime = (index: number, startTime: string) => {
    if (!startTime) {
      return;
    }
    const o = datesAndTimes[index];
    const length = Math.max(toMinutes(o.endTime) - toMinutes(o.startTime), 60);
    const endTime =
      !isRangeOf(o) && toMinutes(o.endTime) <= toMinutes(startTime)
        ? toTime(toMinutes(startTime) + length)
        : o.endTime;
    change(index, { startTime, endTime });
  };

  const toggleRange = (index: number) => {
    const o = datesAndTimes[index];
    const on = !isRangeOf(o);
    change(index, {
      isRange: on,
      endDate: on ? addDays(o.startDate, 1) : o.startDate,
    });
  };

  const addOccurrence = () => {
    const last = datesAndTimes[datesAndTimes.length - 1] || emptyDateAndTime;
    const length =
      (new Date(last.endDate).getTime() - new Date(last.startDate).getTime()) /
      86400000;
    const startDate = addDays(last.startDate, 7);
    const added: DateAndTime = {
      ...emptyDateAndTime,
      startTime: last.startTime,
      endTime: last.endTime,
      isRange: isRangeOf(last),
      startDate,
      endDate: addDays(startDate, Math.max(0, length || 0)),
      attendees: [],
    };
    const next = [...datesAndTimes, added];
    onDatesAndTimesChange(next);
    if (resourceId) {
      withConflict(added).then((checked) =>
        onDatesAndTimesChange([...datesAndTimes, checked])
      );
    }
  };

  const removeOccurrence = (index: number) =>
    onDatesAndTimesChange(datesAndTimes.filter((_item, i) => i !== index));

  // "lördag 18 oktober", to read the date the picker shows as numbers
  const dayName = (date: string, long = true) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        weekday: long ? 'long' : 'short',
        day: 'numeric',
        month: long ? 'long' : 'short',
        timeZone: 'UTC',
      }).format(new Date(`${date}T12:00:00Z`));
    } catch {
      return '';
    }
  };

  if (!datesAndTimes || datesAndTimes.length === 0) {
    return null;
  }

  const isDeletable = datesAndTimes.length > 1;

  return (
    <div className="occurrences">
      {datesAndTimes.map((occurrence, index) => {
        const isRange = isRangeOf(occurrence);
        const status = !occurrence.conflict
          ? ''
          : occurrence.isConflictHard
          ? 'is-conflict'
          : 'is-warning';
        const id = `occurrence-${index}`;
        return (
          <div key={index} className={`occurrence ${status}`}>
            <div className="occurrence-head">
              <span className="occurrence-title">
                {t('form.occurrence.title', { n: index + 1 })}
                <span className="occurrence-day">
                  {isRange
                    ? `${dayName(occurrence.startDate, false)} – ${dayName(
                        occurrence.endDate,
                        false
                      )}`
                    : dayName(occurrence.startDate)}
                </span>
              </span>
              <button
                type="button"
                className="occurrence-days"
                aria-pressed={isRange}
                onClick={() => toggleRange(index)}
              >
                {isRange
                  ? t('form.occurrence.oneDay')
                  : t('form.occurrence.severalDays')}
              </button>
              {isDeletable && (
                <button
                  type="button"
                  className="person-card-remove"
                  aria-label={t('form.occurrence.remove', { n: index + 1 })}
                  onClick={() => removeOccurrence(index)}
                >
                  <XIcon aria-hidden width={16} height={16} />
                </button>
              )}
            </div>

            <div className={`occurrence-fields ${isRange ? 'is-range' : ''}`}>
              <label
                className="occurrence-field is-date"
                htmlFor={`${id}-start`}
              >
                <span>
                  {isRange
                    ? t('form.occurrence.from')
                    : t('form.occurrence.date')}
                </span>
                <input
                  id={`${id}-start`}
                  required
                  type="date"
                  value={occurrence.startDate}
                  onChange={(e) => setStartDate(index, e.target.value)}
                />
              </label>
              {isRange && (
                <label
                  className="occurrence-field is-date"
                  htmlFor={`${id}-end`}
                >
                  <span>{t('form.occurrence.to')}</span>
                  <input
                    id={`${id}-end`}
                    min={occurrence.startDate}
                    required
                    type="date"
                    value={occurrence.endDate}
                    onChange={(e) =>
                      e.target.value &&
                      change(index, {
                        endDate:
                          e.target.value < occurrence.startDate
                            ? occurrence.startDate
                            : e.target.value,
                      })
                    }
                  />
                </label>
              )}
              <label className="occurrence-field" htmlFor={`${id}-from`}>
                <span>{t('form.occurrence.starts')}</span>
                <input
                  id={`${id}-from`}
                  required
                  step={300}
                  type="time"
                  value={occurrence.startTime}
                  onChange={(e) => setStartTime(index, e.target.value)}
                />
              </label>
              <label className="occurrence-field" htmlFor={`${id}-until`}>
                <span>{t('form.occurrence.ends')}</span>
                <input
                  id={`${id}-until`}
                  required
                  step={300}
                  type="time"
                  value={occurrence.endTime}
                  onChange={(e) =>
                    e.target.value && change(index, { endTime: e.target.value })
                  }
                />
              </label>
            </div>

            {occurrence.conflict && (
              <p className="occurrence-conflict">
                <TriangleAlertIcon aria-hidden width={15} height={15} />
                <span>
                  {t('form.conflict.alert')}
                  {!occurrence.isConflictHard &&
                    `. ${t('form.conflict.notExclusiveInfo')}`}
                </span>
              </p>
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="person-add occurrence-add"
        onClick={addOccurrence}
      >
        <PlusIcon aria-hidden width={16} height={16} />
        {t('form.occurrence.add')}
      </button>
    </div>
  );
}

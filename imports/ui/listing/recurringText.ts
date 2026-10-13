import dayjs from 'dayjs';
import type { TFunction } from 'i18next';

import type { WeeklyPattern } from '/imports/api/activities/recurrence';

export const weekdayName = (weekday: number, format = 'dddd') =>
  dayjs().day(weekday).format(format);

const joinList = (items: string[], lang: string) => {
  try {
    return new Intl.ListFormat(lang, { type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
};

export const timeSpan = (startTime?: string, endTime?: string) =>
  [startTime, endTime].filter(Boolean).join('–');

// "Every Wednesday", "Every Tuesday and Thursday", "Every other Monday"
export function describeDays(
  pattern: WeeklyPattern,
  t: TFunction,
  lang: string,
  format = 'dddd'
) {
  const weekdays = [...new Set(pattern.slots.map((s) => s.weekday))];
  const days = joinList(
    weekdays.map((d) => weekdayName(d, format)),
    lang
  );
  return pattern.intervalWeeks === 2
    ? t('recurring.everyOther', { days })
    : t('recurring.every', { days });
}

// The days plus the time when every slot has the same time.
export function describePattern(
  pattern: WeeklyPattern,
  t: TFunction,
  lang: string
) {
  const days = describeDays(pattern, t, lang);
  const times = [
    ...new Set(pattern.slots.map((s) => timeSpan(s.startTime, s.endTime))),
  ];
  return times.length === 1 && times[0] ? `${days} ${times[0]}` : days;
}

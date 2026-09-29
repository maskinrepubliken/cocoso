import dayjs from 'dayjs';

// Recurring activities are stored like any other: one entry per date in
// datesAndTimes. This recognises a weekly rhythm in those dates ("every
// Wednesday 15:30–17:30", "Tue & Thu 19:00", "every other Monday") so the
// listings can show the rhythm once instead of a card with a dozen dates.

interface DateEntry {
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface WeeklySlot {
  weekday: number; // 0 = Sunday … 6 = Saturday, as dayjs().day()
  startTime: string;
  endTime: string;
}

export interface WeeklyPattern {
  slots: WeeklySlot[];
  intervalWeeks: number; // 1 = every week, 2 = every other week
  from: string;
  until: string;
  skipped: string[]; // dates in the rhythm with no occurrence (a holiday)
}

const minOccurrencesPerSlot = 3;
const maxSlots = 4;

const weeksBetween = (a: string, b: string) =>
  Math.round(dayjs(b).diff(dayjs(a), 'day') / 7);

export function getWeeklyPattern(
  datesAndTimes: DateEntry[] | undefined
): WeeklyPattern | null {
  if (!datesAndTimes || datesAndTimes.length < minOccurrencesPerSlot) {
    return null;
  }
  if (datesAndTimes.some((d) => d.endDate && d.endDate !== d.startDate)) {
    return null;
  }

  const bySlot = new Map<string, string[]>();
  datesAndTimes.forEach((d) => {
    const day = dayjs(d.startDate);
    if (!day.isValid()) {
      return;
    }
    const key = `${day.day()}|${d.startTime || ''}|${d.endTime || ''}`;
    bySlot.set(key, [...(bySlot.get(key) || []), d.startDate]);
  });

  if (bySlot.size > maxSlots) {
    return null;
  }

  let intervalWeeks = 0;
  const skipped: string[] = [];
  const slots: WeeklySlot[] = [];
  let from = '';
  let until = '';

  for (const [key, rawDates] of bySlot) {
    const dates = [...new Set(rawDates)].sort();
    if (dates.length < minOccurrencesPerSlot) {
      return null;
    }
    const gaps = dates.slice(1).map((date, i) => weeksBetween(dates[i], date));
    if (gaps.some((gap) => gap < 1)) {
      return null;
    }
    const slotInterval = Math.min(...gaps);
    if (slotInterval > 2 || gaps.some((gap) => gap % slotInterval !== 0)) {
      return null;
    }
    if (intervalWeeks && slotInterval !== intervalWeeks) {
      return null;
    }
    intervalWeeks = slotInterval;

    dates.slice(1).forEach((_date, i) => {
      for (let w = slotInterval; w < gaps[i]; w += slotInterval) {
        skipped.push(dayjs(dates[i]).add(w, 'week').format('YYYY-MM-DD'));
      }
    });
    // A rhythm with more holes than dates is not a rhythm.
    if (skipped.length > dates.length / 2) {
      return null;
    }

    const [weekday, startTime, endTime] = key.split('|');
    slots.push({ weekday: Number(weekday), startTime, endTime });
    if (!from || dates[0] < from) {
      from = dates[0];
    }
    if (!until || dates[dates.length - 1] > until) {
      until = dates[dates.length - 1];
    }
  }

  // Monday first, then by time
  const mondayFirst = (day: number) => (day + 6) % 7;
  slots.sort(
    (a, b) =>
      mondayFirst(a.weekday) - mondayFirst(b.weekday) ||
      a.startTime.localeCompare(b.startTime)
  );

  return { slots, intervalWeeks, from, until, skipped: skipped.sort() };
}

// The first occurrence that has not ended yet, or null.
export function getNextOccurrence<T extends DateEntry>(
  datesAndTimes: T[] | undefined,
  today: string = dayjs().format('YYYY-MM-DD')
): T | null {
  if (!datesAndTimes) {
    return null;
  }
  return (
    [...datesAndTimes]
      .filter((d) => (d.endDate || d.startDate) >= today)
      .sort((a, b) =>
        `${a.startDate}${a.startTime}`.localeCompare(
          `${b.startDate}${b.startTime}`
        )
      )[0] || null
  );
}

// Is the activity a weekly thing that is still going on?
export function isRecurringActivity(activity: {
  datesAndTimes?: DateEntry[];
}): boolean {
  const pattern = getWeeklyPattern(activity?.datesAndTimes);
  return Boolean(pattern && pattern.until >= dayjs().format('YYYY-MM-DD'));
}

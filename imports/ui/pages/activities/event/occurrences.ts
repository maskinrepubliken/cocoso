import dayjs from 'dayjs';

export interface Attendee {
  email?: string;
  firstName?: string;
  lastName?: string;
  numberOfPeople?: number;
  isNameHidden?: boolean;
}

export interface Occurrence {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  attendees?: Attendee[];
}

export const todayString = () => dayjs().format('YYYY-MM-DD');

export const isPastOccurrence = (o: Occurrence) => o.endDate < todayString();

export const countPeople = (attendees?: Attendee[]) =>
  (attendees || []).reduce(
    (sum, a) => sum + (Number(a.numberOfPeople) || 1),
    0
  );

// "torsdag 1 oktober, 19:00–20:30", or a range for multi-day occurrences.
export const formatOccurrence = (o: Occurrence) => {
  if (o.startDate === o.endDate) {
    return `${dayjs(o.startDate).format('dddd D MMMM')}, ${o.startTime}–${
      o.endTime
    }`;
  }
  return `${dayjs(o.startDate).format('D MMM')} ${o.startTime} – ${dayjs(
    o.endDate
  ).format('D MMM')} ${o.endTime}`;
};

// The occurrence a page opens on: the one named in the address
// (?date=YYYY-MM-DD, optionally &time=HH:mm, e.g. from the calendar), else
// the next one that has not passed, else the last one.
export const pickOccurrenceIndex = (
  dates: Occurrence[],
  date?: string | null,
  time?: string | null
) => {
  if (date) {
    const index = dates.findIndex(
      (d) => d.startDate === date && (!time || d.startTime === time)
    );
    if (index > -1) {
      return index;
    }
  }
  const next = dates.findIndex((d) => !isPastOccurrence(d));
  return next > -1 ? next : dates.length - 1;
};

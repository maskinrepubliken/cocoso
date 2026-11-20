import type { Occurrence } from './occurrences';

// One occurrence of an event as an iCalendar file (.ics), for the visitor's
// own calendar. Times are written without a time zone ("floating"): the
// event is at 19:00 where it is held, whatever the phone thinks.

const escapeText = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, ';')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const stamp = (date: string, time?: string) =>
  `${date.replace(/-/g, '')}T${(time || '00:00').replace(':', '')}00`;

interface CalendarEvent {
  id: string;
  title?: string;
  occurrence: Occurrence;
  // Where: the place's name and, when known, its address
  location?: string;
  url: string;
}

export function calendarFile({
  id,
  title,
  occurrence,
  location,
  url,
}: CalendarEvent) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cocoso//Event//SV',
    'BEGIN:VEVENT',
    `UID:${id}-${occurrence.startDate}-${occurrence.startTime}@cocoso`,
    // The same on the server and in the browser, for hydration
    `DTSTAMP:${stamp(occurrence.startDate, occurrence.startTime)}Z`,
    `DTSTART:${stamp(occurrence.startDate, occurrence.startTime)}`,
    `DTEND:${stamp(occurrence.endDate, occurrence.endTime)}`,
    `SUMMARY:${escapeText(title || '')}`,
    location ? `LOCATION:${escapeText(location)}` : '',
    `DESCRIPTION:${escapeText(url)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

// As a link's href, so the file needs no round trip to the server
export const calendarFileHref = (event: CalendarEvent) =>
  `data:text/calendar;charset=utf-8,${encodeURIComponent(calendarFile(event))}`;

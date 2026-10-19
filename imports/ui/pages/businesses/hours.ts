import { useEffect, useState } from 'react';

// Weekly opening hours: one entry per opening, `day` 1 (Monday) to
// 7 (Sunday); a day without an entry is closed.
export interface Opening {
  day: number;
  opens: string;
  closes: string;
}

export const WEEK = [1, 2, 3, 4, 5, 6, 7];

// 1 (Monday) to 7 (Sunday), from a Date.
export const isoDay = (date: Date) => ((date.getDay() + 6) % 7) + 1;

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// "10–18", or "10.30–14" — how hours are written on a Swedish door.
export const formatTime = (time: string) => {
  const [h, m] = time.split(':');
  return m === '00' ? String(Number(h)) : `${Number(h)}.${m}`;
};

export const openingsOn = (hours: Opening[] | undefined, day: number) =>
  (hours || [])
    .filter((o) => o.day === day)
    .sort((a, b) => minutes(a.opens) - minutes(b.opens));

export const formatDay = (hours: Opening[] | undefined, day: number) =>
  openingsOn(hours, day)
    .map((o) => `${formatTime(o.opens)}–${formatTime(o.closes)}`)
    .join(', ');

export type OpenState =
  | { open: true; closes: string }
  | { open: false; next?: { day: number; opens: string } };

// Whether it is open at `now`, and when it closes or next opens.
export function openState(hours: Opening[] | undefined, now: Date): OpenState {
  const today = isoDay(now);
  const current = now.getHours() * 60 + now.getMinutes();
  const openNow = openingsOn(hours, today).find(
    (o) => minutes(o.opens) <= current && current < minutes(o.closes)
  );
  if (openNow) {
    return { open: true, closes: openNow.closes };
  }
  for (let ahead = 0; ahead < 7; ahead += 1) {
    const day = ((today - 1 + ahead) % 7) + 1;
    const next = openingsOn(hours, day).find(
      (o) => ahead > 0 || minutes(o.opens) > current
    );
    if (next) {
      return { open: false, next: { day, opens: next.opens } };
    }
  }
  return { open: false };
}

// The current time, but only after the page has mounted: the server and
// the visitor may be in different time zones, so anything that depends on
// the clock is left out of the server render.
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

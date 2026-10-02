import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAtomValue } from 'jotai';

import { styled } from '/stitches.config';
import { renderedAtom } from '/imports/state';
import {
  getWeeklyPattern,
  WeeklyPattern,
} from '/imports/api/activities/recurrence';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

import { getEntryPath } from './useOpenEntry';
import { describeDays, timeSpan, weekdayName } from './recurringText';

// Two compact views for the front of the activities listing: what happens
// on one day (one line per activity), and the weekly rhythm of everything
// that recurs, shown once per weekday instead of one card per date.

const Panel = styled('section', {
  background: 'white',
  borderRadius: '14px',
  boxShadow:
    '0 1px 0 var(--cocoso-colors-theme-200), 0 10px 28px -18px rgba(0, 60, 10, 0.35)',
  margin: '0 auto 1rem',
  maxWidth: '1180px',
  padding: '0.7rem 1.1rem 0.3rem',
  '@media (max-width: 700px)': { padding: '0.6rem 0.8rem 0.2rem' },
});

const PanelHead = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  justifyContent: 'space-between',
  marginBottom: '0.2rem',
});

const PanelTitle = styled('h2', {
  fontSize: '1.1rem',
  fontWeight: 700,
  margin: 0,
  '& small': {
    color: 'var(--cocoso-colors-theme-700)',
    fontSize: '1rem',
    fontWeight: 400,
    marginLeft: '0.6rem',
    opacity: 0.8,
  },
});

const Segmented = styled('div', {
  background: 'var(--cocoso-colors-theme-50)',
  borderRadius: '999px',
  display: 'flex',
  padding: '3px',
});

const SegButton = styled('button', {
  background: 'transparent',
  border: 0,
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
  fontWeight: 600,
  padding: '0.3rem 0.9rem',
  variants: {
    active: {
      true: { background: 'var(--cocoso-colors-theme-600)', color: 'white' },
    },
  },
});

const Rows = styled('ul', {
  columnGap: '2.5rem',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  '@media (max-width: 800px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  variants: {
    single: { true: { gridTemplateColumns: 'minmax(0, 1fr)' } },
  },
});

const Row = styled(Link, {
  alignItems: 'center',
  borderTop: '1px solid var(--cocoso-colors-theme-100)',
  color: 'inherit',
  display: 'grid',
  gap: '0.9rem',
  gridTemplateColumns: '6.5rem minmax(0, 1fr) auto',
  padding: '0.4rem 0',
  textDecoration: 'none',
  '&:hover strong': { textDecoration: 'underline' },
  '@media (max-width: 700px)': { gridTemplateColumns: '5.6rem minmax(0, 1fr)' },
});

const Time = styled('span', {
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  '@media (max-width: 700px)': { fontSize: '0.875rem' },
});

const What = styled('span', {
  minWidth: 0,
  '& strong': { display: 'block', fontWeight: 600 },
  '& small': {
    color: 'var(--cocoso-colors-theme-800)',
    display: 'block',
    fontSize: '0.8rem',
    marginTop: '2px',
    opacity: 0.75,
  },
});

const Pill = styled('span', {
  background: 'var(--cocoso-colors-theme-50)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-700)',
  fontSize: '0.75rem',
  fontWeight: 700,
  padding: '0.2rem 0.6rem',
  whiteSpace: 'nowrap',
  '@media (max-width: 700px)': { display: 'none' },
  variants: {
    kind: {
      recurring: { background: '#eef2ff', color: '#3b4aa8' },
      now: {
        '&::before': {
          background: '#22c55e',
          borderRadius: '50%',
          boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)',
          content: '""',
          display: 'inline-block',
          height: '7px',
          marginRight: '6px',
          verticalAlign: '1px',
          width: '7px',
        },
      },
    },
  },
});

const Empty = styled('p', {
  borderTop: '1px solid var(--cocoso-colors-theme-100)',
  margin: 0,
  opacity: 0.7,
  padding: '0.5rem 0',
});

// The week heads with its title and intro on one line to save height.
const SectionHead = styled('div', {
  alignItems: 'baseline',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem 0.75rem',
  margin: '0 auto 0.5rem',
  maxWidth: '1180px',
});

const SectionTitle = styled('h2', {
  fontSize: '1.1rem',
  fontWeight: 700,
  margin: 0,
});

const SectionIntro = styled('p', {
  fontSize: '0.875rem',
  margin: 0,
  opacity: 0.75,
});

const Week = styled('div', {
  display: 'grid',
  gap: '0.4rem',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  margin: '0 auto 1.25rem',
  maxWidth: '1180px',
  '@media (max-width: 900px)': {
    display: 'flex',
    margin: '0 -1rem 1.25rem',
    overflowX: 'auto',
    padding: '0 1rem 0.5rem',
    scrollSnapType: 'x mandatory',
  },
});

const Day = styled('div', {
  background: 'rgba(255, 255, 255, 0.55)',
  border: '1px solid var(--cocoso-colors-theme-200)',
  borderRadius: '10px',
  padding: '0.45rem',
  '@media (max-width: 900px)': {
    flex: '0 0 68%',
    scrollSnapAlign: 'start',
  },
  variants: {
    today: {
      true: {
        background: 'white',
        border: '2px solid var(--cocoso-colors-theme-600)',
      },
    },
  },
});

const DayName = styled('h3', {
  color: 'var(--cocoso-colors-theme-800)',
  display: 'flex',
  fontSize: '0.8rem',
  justifyContent: 'space-between',
  letterSpacing: '0.06em',
  margin: '0 0 0.35rem',
  textTransform: 'uppercase',
  variants: {
    today: { true: { color: 'var(--cocoso-colors-theme-600)' } },
  },
});

const Slot = styled(Link, {
  background: 'white',
  borderLeft: '4px solid var(--cocoso-colors-theme-500)',
  borderRadius: '6px',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
  color: 'inherit',
  display: 'block',
  marginBottom: '0.3rem',
  padding: '0.3rem 0.45rem',
  textDecoration: 'none',
  '&:hover': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' },
  '& b': {
    display: 'block',
    fontSize: '0.8rem',
    fontVariantNumeric: 'tabular-nums',
    opacity: 0.75,
  },
  '& strong': { display: 'block', fontSize: '0.9rem', lineHeight: 1.2 },
  '& small': {
    display: 'block',
    fontSize: '0.75rem',
    lineHeight: 1.25,
    marginTop: '2px',
    opacity: 0.7,
  },
});

interface Occurrence {
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

interface Activity {
  _id: string;
  title: string;
  resource?: string;
  place?: string;
  datesAndTimes?: Occurrence[];
  [key: string]: any;
}

interface OverviewProps {
  activities: Activity[];
  placeOf: (activity: Activity) => string | null;
}

const withPatterns = (activities: Activity[]) =>
  activities
    .map((activity) => ({
      activity,
      pattern: getWeeklyPattern(activity.datesAndTimes),
    }))
    .filter((a): a is { activity: Activity; pattern: WeeklyPattern } =>
      Boolean(a.pattern)
    );

function useEntryLink() {
  const prefix = useLocationPrefix();
  return (activity: Activity, occurrence?: Occurrence) => {
    const path = `${prefix}${getEntryPath(activity, 'activities')}`;
    if (!occurrence) {
      return path;
    }
    const query = new URLSearchParams({
      date: occurrence.startDate,
      time: occurrence.startTime || '',
    });
    return `${path}?${query}`;
  };
}

// The venue, then the place it is in unless the venue already names it
// ("Väveriet, Uddebo" needs no "· Uddebo").
const placeText = (activity: Activity, placeOf: OverviewProps['placeOf']) => {
  const venue = activity.resource || activity.place;
  const place = placeOf(activity);
  if (venue && place && venue.includes(place)) {
    return venue;
  }
  return [venue, place].filter(Boolean).join(' · ');
};

// Everything on one date, earliest first.
function rowsForDate(activities: Activity[], date: string) {
  const items: {
    activity: Activity;
    occurrence: Occurrence;
    pattern: WeeklyPattern | null;
  }[] = [];
  activities.forEach((activity) => {
    const pattern = getWeeklyPattern(activity.datesAndTimes);
    activity.datesAndTimes?.forEach((occurrence) => {
      const end = occurrence.endDate || occurrence.startDate;
      if (occurrence.startDate <= date && end >= date) {
        items.push({ activity, occurrence, pattern });
      }
    });
  });
  return items.sort((a, b) =>
    (a.occurrence.startTime || '').localeCompare(b.occurrence.startTime || '')
  );
}

export function DayAgenda({ activities, placeOf }: OverviewProps) {
  const [t, i18n] = useTranslation('common');
  const entryLink = useEntryLink();
  const rendered = useAtomValue(renderedAtom);
  const [offset, setOffset] = useState(0);
  const day = dayjs().add(offset, 'day');
  const date = day.format('YYYY-MM-DD');
  const now = dayjs().format('HH:mm');

  const rows = rowsForDate(activities, date);

  const isOngoing = (o: Occurrence) =>
    rendered &&
    offset === 0 &&
    (o.startTime || '') <= now &&
    (!o.endTime || o.endTime > now);

  return (
    <Panel aria-labelledby="day-agenda-title">
      <PanelHead>
        <PanelTitle id="day-agenda-title">
          {offset === 0 ? t('recurring.today') : t('recurring.tomorrow')}
          <small>{day.format('dddd D MMMM')}</small>
        </PanelTitle>
        <Segmented role="group">
          <SegButton
            active={offset === 0}
            aria-pressed={offset === 0}
            onClick={() => setOffset(0)}
          >
            {t('recurring.today')}
          </SegButton>
          <SegButton
            active={offset === 1}
            aria-pressed={offset === 1}
            onClick={() => setOffset(1)}
          >
            {t('recurring.tomorrow')}
          </SegButton>
        </Segmented>
      </PanelHead>

      {rows.length === 0 ? (
        <Empty>{t('recurring.nothing')}</Empty>
      ) : (
        <Rows single={rows.length < 4}>
          {rows.map(({ activity, occurrence, pattern }) => {
            const multiDay =
              occurrence.endDate && occurrence.endDate !== occurrence.startDate;
            const ongoing = isOngoing(occurrence);
            return (
              <li
                key={activity._id + occurrence.startDate + occurrence.startTime}
              >
                <Row to={entryLink(activity, occurrence)}>
                  <Time>
                    {multiDay
                      ? occurrence.startTime
                      : timeSpan(occurrence.startTime, occurrence.endTime)}
                  </Time>
                  <What>
                    <strong>{activity.title}</strong>
                    <small>{placeText(activity, placeOf)}</small>
                  </What>
                  {ongoing ? (
                    <Pill kind="now">{t('recurring.now')}</Pill>
                  ) : pattern ? (
                    <Pill kind="recurring">
                      {describeDays(pattern, t, i18n.language)}
                    </Pill>
                  ) : (
                    <span />
                  )}
                </Row>
              </li>
            );
          })}
        </Rows>
      )}
    </Panel>
  );
}

// Monday first
const weekOrder = [1, 2, 3, 4, 5, 6, 0];

export function WeeklySchedule({ activities, placeOf }: OverviewProps) {
  const [t] = useTranslation('common');
  const entryLink = useEntryLink();
  const recurring = useMemo(() => withPatterns(activities), [activities]);
  const todayWeekday = dayjs().day();
  const weekRef = useRef<HTMLDivElement>(null);

  // When the week scrolls sideways (phones), start at today.
  useEffect(() => {
    const week = weekRef.current;
    const today = week?.querySelector<HTMLElement>('[data-today]');
    if (week && today && week.scrollWidth > week.clientWidth) {
      week.scrollLeft = today.offsetLeft - week.offsetLeft - 16;
    }
  }, [recurring.length]);

  if (recurring.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="weekly-title">
      <SectionHead>
        <SectionTitle id="weekly-title">
          {t('recurring.weekTitle')}
        </SectionTitle>
        <SectionIntro>{t('recurring.weekIntro')}</SectionIntro>
      </SectionHead>
      <Week ref={weekRef}>
        {weekOrder.map((weekday) => {
          const slots = recurring
            .flatMap(({ activity, pattern }) =>
              pattern.slots
                .filter((slot) => slot.weekday === weekday)
                .map((slot) => ({ activity, pattern, slot }))
            )
            .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
          const isToday = weekday === todayWeekday;
          return (
            <Day
              key={weekday}
              today={isToday}
              data-today={isToday || undefined}
            >
              <DayName today={isToday}>
                <span>{weekdayName(weekday, 'ddd')}</span>
                {isToday && <span>{t('recurring.today')}</span>}
              </DayName>
              {slots.map(({ activity, pattern, slot }) => (
                <Slot key={activity._id} to={entryLink(activity)}>
                  <b>{timeSpan(slot.startTime, slot.endTime)}</b>
                  <strong>{activity.title}</strong>
                  <small>
                    {[
                      placeText(activity, placeOf),
                      pattern.intervalWeeks === 2
                        ? t('recurring.everyOtherWeek')
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </Slot>
              ))}
            </Day>
          );
        })}
      </Week>
    </section>
  );
}

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

// Each weekday has an earthy colour of its own and today is green; the
// text stays black and the details green.
const ink = '#151515';
const today = '#b9dba0'; // a light leaf green, as light as the other days
const earth: Record<number, string> = {
  1: '#e9dcc4', // sand
  2: '#e2c6a8', // clay
  3: '#d9c79a', // ochre
  4: '#c9cfa4', // olive
  5: '#c3d1b8', // sage
  6: '#d8bfa9', // terracotta
  0: '#cdc3b4', // stone
};
export const dayColor = (weekday: number, isToday = false) =>
  isToday ? today : earth[weekday];

// The notice board: woven texture in the season's colour, every event a
// paper note held by a tegel pin.
const Panel = styled('section', {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgba(30, 79, 27, 0.07) 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, rgba(30, 79, 27, 0.07) 0 1px, transparent 1px 7px)',
  borderRadius: 'var(--cocoso-radius-meny)',
  boxShadow: 'var(--cocoso-skugga)',
  color: 'var(--cocoso-mylla)',
  margin: '0 auto 1.25rem',
  maxWidth: '1180px',
  padding: '1rem 1.25rem 1.25rem',
  '@media (max-width: 700px)': { padding: '0.8rem 0.9rem 1rem' },
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
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontSize: '1.65rem',
  fontWeight: 600,
  margin: 0,
  '& small': {
    color: 'var(--cocoso-mylla-soft)',
    fontFamily: 'var(--cocoso-body-font-family)',
    fontSize: '0.95rem',
    fontWeight: 400,
    marginLeft: '0.7rem',
  },
});

const Segmented = styled('div', {
  background: 'rgba(255, 253, 247, 0.7)',
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
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.875rem',
  fontWeight: 700,
  padding: '0.35rem 0.95rem',
  transition: 'background-color 0.15s ease',
  variants: {
    active: {
      true: { background: 'var(--cocoso-colors-theme-700)', color: 'white' },
    },
  },
});

const Rows = styled('ul', {
  display: 'grid',
  gap: '0.9rem 0.75rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
  listStyle: 'none',
  margin: '0.9rem 0 0',
  padding: '0.3rem 0 0',
  variants: {
    single: { true: {} },
  },
});

// A note on the board: paper, a pin, the time in green, the title in
// Fraunces, the place in small type.
const Row = styled(Link, {
  background: 'var(--cocoso-papper)',
  borderRadius: '8px',
  boxShadow: 'var(--cocoso-skugga-kort)',
  color: 'inherit',
  display: 'grid',
  gap: '0.15rem',
  gridTemplateRows: 'auto auto auto',
  height: '100%',
  padding: '0.9rem 0.9rem 0.75rem',
  position: 'relative',
  textDecoration: 'none',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  '&::before': {
    background: 'var(--cocoso-season-accent, var(--cocoso-tegel))',
    borderRadius: '50%',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), inset 0 -2px 3px rgba(0, 0, 0, 0.2)',
    content: '""',
    height: '12px',
    left: '50%',
    marginLeft: '-6px',
    position: 'absolute',
    top: '-6px',
    width: '12px',
  },
  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 26px -14px rgba(60, 40, 20, 0.5)' },
});

const Time = styled('span', {
  color: 'var(--cocoso-colors-theme-700)',
  fontSize: '0.95rem',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

const What = styled('span', {
  minWidth: 0,
  '& strong': {
    display: 'block',
    fontFamily: 'var(--cocoso-font-display)',
    fontVariationSettings: '"SOFT" 60',
    fontSize: '1.1rem',
    fontWeight: 600,
    lineHeight: 1.2,
    marginTop: '0.15rem',
  },
  '& small': {
    color: 'var(--cocoso-mylla-soft)',
    display: 'block',
    fontSize: '0.82rem',
    marginTop: '3px',
  },
});

const Pill = styled('span', {
  alignSelf: 'start',
  background: 'var(--cocoso-colors-theme-100)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-700)',
  display: 'inline-flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  justifySelf: 'start',
  marginTop: '0.5rem',
  padding: '0.25rem 0.6rem',
  whiteSpace: 'nowrap',
  variants: {
    kind: {
      recurring: {},
      now: {
        '&::before': {
          background: 'var(--cocoso-colors-theme-600)',
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
  color: 'var(--cocoso-mylla-soft)',
  fontFamily: 'var(--cocoso-font-display)',
  fontStyle: 'italic',
  fontSize: '1.05rem',
  margin: '0.75rem 0 0',
});

// The week heads with its title and intro on one line to save height.
const SectionHead = styled('div', {
  alignItems: 'baseline',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem 0.75rem',
  margin: '0 0 0.5rem',
});

const WeekArrows = styled('div', {
  display: 'flex',
  gap: '4px',
  marginLeft: 'auto',
  '@media (max-width: 900px)': { display: 'none' },
});

const WeekArrow = styled('button', {
  all: 'unset',
  alignItems: 'center',
  background: 'var(--cocoso-papper)',
  borderRadius: '999px',
  boxShadow: 'var(--cocoso-skugga)',
  color: 'var(--cocoso-colors-theme-800)',
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: '1.1rem',
  height: '32px',
  justifyContent: 'center',
  width: '32px',
  '&:hover': { background: 'var(--cocoso-colors-theme-50)' },
  '&:focus-visible': {
    outline: '2px solid var(--cocoso-colors-theme-500)',
    outlineOffset: '2px',
  },
  '&:disabled': { cursor: 'default', opacity: 0.4 },
});

const SectionTitle = styled('h2', {
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontSize: '1.5rem',
  fontWeight: 600,
  margin: 0,
});

const SectionIntro = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.9rem',
  margin: 0,
});

// A strip of days you scroll sideways, today first, a week in view on a
// wide screen and more weeks added as you go. Each day snaps into place.
const WEEK_GAP = 6;

const Week = styled('div', {
  display: 'flex',
  gap: `${WEEK_GAP}px`,
  margin: '0 0 1.25rem',
  overflowX: 'auto',
  paddingBottom: '0.5rem',
  scrollSnapType: 'x mandatory',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
  '@media (max-width: 900px)': {
    margin: '0 calc(-1 * var(--cocoso-gutter)) 1.25rem',
    padding: '0 var(--cocoso-gutter) 0.5rem',
    scrollPadding: '0 var(--cocoso-gutter)',
  },
});

const Day = styled('div', {
  borderRadius: '10px',
  boxShadow: 'var(--cocoso-skugga-kort)',
  boxSizing: 'border-box',
  color: ink,
  flex: `0 0 calc((100% - ${6 * WEEK_GAP}px) / 7)`,
  minWidth: 0,
  padding: '0.55rem',
  scrollSnapAlign: 'start',
  '@media (max-width: 1100px)': {
    flex: `0 0 calc((100% - ${4 * WEEK_GAP}px) / 5)`,
  },
  '@media (max-width: 900px)': {
    flex: '0 0 68%',
  },
  variants: {
    today: {
      true: {
        outline: '2px solid var(--cocoso-season-accent, var(--cocoso-tegel))',
        outlineOffset: '-2px',
      },
    },
  },
});

const DayName = styled('h3', {
  color: ink,
  display: 'flex',
  fontSize: '0.8rem',
  justifyContent: 'space-between',
  letterSpacing: '0.06em',
  margin: '0 0 0.35rem',
  textTransform: 'uppercase',
  fontFamily: 'var(--cocoso-font-ui)',
  '& small': {
    fontWeight: 500,
    letterSpacing: 0,
    marginLeft: '0.4rem',
    opacity: 0.7,
    textTransform: 'none',
  },
  variants: {
    today: {
      true: {
        '& span:last-child': { color: 'var(--cocoso-season-accent, var(--cocoso-tegel))' },
      },
    },
  },
});

const Slot = styled(Link, {
  background: 'rgba(255, 253, 247, 0.85)',
  borderRadius: '8px',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
  color: 'inherit',
  display: 'block',
  marginBottom: '0.35rem',
  padding: '0.4rem 0.55rem',
  textDecoration: 'none',
  transition: 'box-shadow 0.15s ease, transform 0.15s ease',
  '&:hover': { boxShadow: '0 6px 14px -8px rgba(60, 40, 20, 0.5)', transform: 'translateY(-1px)' },
  '& b': {
    display: 'block',
    fontSize: '0.8rem',
    fontVariantNumeric: 'tabular-nums',
    opacity: 0.75,
  },
  '& strong': {
    display: 'block',
    fontFamily: 'var(--cocoso-font-display)',
    fontVariationSettings: '"SOFT" 60',
    fontSize: '0.98rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
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
    <Panel
      aria-labelledby="day-agenda-title"
      css={{ backgroundColor: 'var(--cocoso-season-tavla)' }}
    >
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

// The days from today on: each repeats its weekday's activities, within
// the span of their pattern and skipping the dates it skips. Seven days
// to begin with, seven more whenever the end comes into view.
const INITIAL_DAYS = 14;
const MORE_DAYS = 7;

export function WeeklySchedule({ activities, placeOf }: OverviewProps) {
  const [t] = useTranslation('common');
  const entryLink = useEntryLink();
  const recurring = useMemo(() => withPatterns(activities), [activities]);
  const weekRef = useRef<HTMLDivElement>(null);
  const [dayCount, setDayCount] = useState(INITIAL_DAYS);
  const [atStart, setAtStart] = useState(true);
  const todayKey = dayjs().format('YYYY-MM-DD');

  const days = useMemo(
    () =>
      Array.from({ length: dayCount }, (_, i) => dayjs(todayKey).add(i, 'day')),
    [dayCount, todayKey]
  );

  useEffect(() => {
    const week = weekRef.current;
    if (!week) return undefined;
    const onScroll = () => {
      setAtStart(week.scrollLeft < 8);
      const column = week.firstElementChild as HTMLElement | null;
      const width = column?.offsetWidth || 160;
      if (week.scrollLeft + week.clientWidth > week.scrollWidth - width * 3) {
        setDayCount((count) => count + MORE_DAYS);
      }
    };
    week.addEventListener('scroll', onScroll, { passive: true });
    return () => week.removeEventListener('scroll', onScroll);
  }, []);

  const step = (direction: 1 | -1) => {
    const week = weekRef.current;
    if (!week) return;
    const column = week.firstElementChild as HTMLElement | null;
    const width = (column?.offsetWidth || 160) + WEEK_GAP;
    week.scrollBy({ left: direction * width * 3, behavior: 'smooth' });
  };

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
        <WeekArrows>
          <WeekArrow
            aria-label={t('recurring.earlier')}
            disabled={atStart}
            type="button"
            onClick={() => step(-1)}
          >
            ‹
          </WeekArrow>
          <WeekArrow
            aria-label={t('recurring.later')}
            type="button"
            onClick={() => step(1)}
          >
            ›
          </WeekArrow>
        </WeekArrows>
      </SectionHead>
      <Week ref={weekRef}>
        {days.map((day, offset) => {
          const date = day.format('YYYY-MM-DD');
          const weekday = day.day();
          const slots = recurring
            .filter(
              ({ pattern }) =>
                pattern.from <= date &&
                pattern.until >= date &&
                !pattern.skipped.includes(date)
            )
            .flatMap(({ activity, pattern }) =>
              pattern.slots
                .filter((slot) => slot.weekday === weekday)
                .map((slot) => ({ activity, pattern, slot }))
            )
            .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
          const isToday = offset === 0;
          return (
            <Day
              key={date}
              css={{ background: dayColor(weekday, isToday) }}
              today={isToday}
            >
              <DayName today={isToday}>
                <span>
                  {weekdayName(weekday, 'ddd')}
                  <small>{day.format('D MMM')}</small>
                </span>
                {isToday && <span>{t('recurring.today')}</span>}
              </DayName>
              {slots.length === 0 && (
                <Empty css={{ fontSize: '0.9rem', margin: '0.3rem 0 0' }}>
                  {t('recurring.nothing')}
                </Empty>
              )}
              {slots.map(({ activity, pattern, slot }) => (
                <Slot
                  key={activity._id}
                  to={entryLink(activity, { startDate: date, startTime: slot.startTime })}
                >
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

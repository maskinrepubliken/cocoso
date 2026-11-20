import React, { useMemo, useState } from 'react';
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
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

import { getEntryPath } from './useOpenEntry';
import { describeDays, timeSpan } from './recurringText';

// Two compact views for the start page: what happens on one day (a note
// per event, leafed through day by day), and the weekly rhythm of
// everything that recurs, shown once per weekday instead of one card per
// date.

// Each weekday has an earthy colour of its own; the text stays black and
// the details green.
const ink = '#151515';
const earth: Record<number, string> = {
  1: '#e9dcc4', // sand
  2: '#e2c6a8', // clay
  3: '#d9c79a', // ochre
  4: '#c9cfa4', // olive
  5: '#c3d1b8', // sage
  6: '#d8bfa9', // terracotta
  0: '#cdc3b4', // stone
};
export const dayColor = (weekday: number) => earth[weekday];

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
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
  height: '100%',
  padding: '0.9rem 0.9rem 0.75rem',
  position: 'relative',
  textDecoration: 'none',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  '&::before': {
    background: 'var(--cocoso-season-accent, var(--cocoso-tegel))',
    borderRadius: '50%',
    boxShadow:
      '0 1px 2px rgba(0, 0, 0, 0.3), inset 0 -2px 3px rgba(0, 0, 0, 0.2)',
    content: '""',
    height: '12px',
    left: '50%',
    marginLeft: '-6px',
    position: 'absolute',
    top: '-6px',
    width: '12px',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 14px 26px -14px rgba(60, 40, 20, 0.5)',
  },
});

// The event's main picture across the top of its note, under the pin
const Picture = styled('img', {
  aspectRatio: '16 / 9',
  background: 'var(--cocoso-colors-theme-100)',
  borderRadius: '8px 8px 0 0',
  display: 'block',
  margin: '-0.9rem -0.9rem 0.6rem',
  // past the site's max-width for pictures, out to the note's edges
  maxWidth: 'none',
  objectFit: 'cover',
  width: 'calc(100% + 1.8rem)',
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
  alignSelf: 'flex-start',
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
      cancelled: {
        background: 'var(--cocoso-lingon)',
        color: 'white',
      },
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

const SectionHead = styled('div', {
  margin: '0 0 0.5rem',
});

// Back and forward between the days of the agenda
const DayArrows = styled('div', {
  display: 'flex',
  gap: '4px',
});

const DayArrow = styled('button', {
  all: 'unset',
  alignItems: 'center',
  background: 'var(--cocoso-papper)',
  borderRadius: '999px',
  boxShadow: 'var(--cocoso-skugga)',
  color: 'var(--cocoso-colors-theme-800)',
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: '1.1rem',
  height: '36px',
  justifyContent: 'center',
  width: '36px',
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

// The seven weekdays side by side, Monday first; on a narrower screen
// that has no room for seven columns they are one row you swipe, out to
// the screen's edges, with the next day peeking in.
const Week = styled('div', {
  display: 'grid',
  gap: '6px',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  margin: '0 0 1.25rem',
  '@media (max-width: 1100px)': {
    display: 'flex',
    gap: '8px',
    margin: '0 calc(-1 * var(--cocoso-gutter)) 1.25rem',
    overflowX: 'auto',
    padding: '4px var(--cocoso-gutter) 10px',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
  },
});

const Day = styled('div', {
  borderRadius: '10px',
  boxShadow: 'var(--cocoso-skugga-kort)',
  boxSizing: 'border-box',
  color: ink,
  minWidth: 0,
  padding: '0.55rem',
  '@media (max-width: 1100px)': {
    flex: '0 0 auto',
    width: 'min(62vw, 240px)',
  },
});

const DayName = styled('h3', {
  color: ink,
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  margin: '0 0 0.35rem',
  textTransform: 'uppercase',
  fontFamily: 'var(--cocoso-font-ui)',
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
  '&:hover': {
    boxShadow: '0 6px 14px -8px rgba(60, 40, 20, 0.5)',
    transform: 'translateY(-1px)',
  },
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
    hyphens: 'auto',
    lineHeight: 1.2,
    overflowWrap: 'break-word',
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

// The dates from today on with something on them, in order. A long event
// counts on each of its days; nothing further ahead than the horizon.
const HORIZON_DAYS = 120;

function eventDates(activities: Activity[], from: string) {
  const until = dayjs(from).add(HORIZON_DAYS, 'day').format('YYYY-MM-DD');
  const dates = new Set<string>();
  activities.forEach((activity) => {
    activity.datesAndTimes?.forEach((occurrence) => {
      const end = occurrence.endDate || occurrence.startDate;
      if (!occurrence.startDate || end < from || occurrence.startDate > until) {
        return;
      }
      const last = end > until ? until : end;
      let date = occurrence.startDate < from ? from : occurrence.startDate;
      while (date <= last) {
        dates.add(date);
        date = dayjs(date).add(1, 'day').format('YYYY-MM-DD');
      }
    });
  });
  return [...dates].sort();
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

// One day's events as notes on the board, today to begin with. The arrows
// leaf to the next and the previous day that has something on it: never
// back past today, and days with nothing are skipped.
export function DayAgenda({ activities, placeOf }: OverviewProps) {
  const [t, i18n] = useTranslation('common');
  const entryLink = useEntryLink();
  const rendered = useAtomValue(renderedAtom);
  const todayKey = dayjs().format('YYYY-MM-DD');
  const [chosen, setChosen] = useState<string | null>(null);
  const date = chosen && chosen > todayKey ? chosen : todayKey;
  const day = dayjs(date);
  const isToday = date === todayKey;
  const isTomorrow =
    date === dayjs(todayKey).add(1, 'day').format('YYYY-MM-DD');
  const now = dayjs().format('HH:mm');

  const dates = eventDates(activities, todayKey);
  const next = dates.find((d) => d > date);
  // back from a later day: the nearest earlier day with events, or today
  const previous = isToday
    ? undefined
    : dates.filter((d) => d < date).pop() || todayKey;

  const rows = rowsForDate(activities, date);

  const isOngoing = (o: Occurrence) =>
    rendered &&
    isToday &&
    (o.startTime || '') <= now &&
    (!o.endTime || o.endTime > now);

  return (
    <Panel
      aria-labelledby="day-agenda-title"
      css={{ backgroundColor: 'var(--cocoso-season-tavla)' }}
    >
      <PanelHead>
        <PanelTitle id="day-agenda-title" aria-live="polite">
          {isToday
            ? t('recurring.today')
            : isTomorrow
            ? t('recurring.tomorrow')
            : capitalize(day.format('dddd'))}
          <small>
            {day.format(isToday || isTomorrow ? 'dddd D MMMM' : 'D MMMM')}
          </small>
        </PanelTitle>
        <DayArrows>
          <DayArrow
            aria-label={t('recurring.earlier')}
            disabled={!previous}
            title={t('recurring.earlier')}
            type="button"
            onClick={() => previous && setChosen(previous)}
          >
            ‹
          </DayArrow>
          <DayArrow
            aria-label={t('recurring.later')}
            disabled={!next}
            title={t('recurring.later')}
            type="button"
            onClick={() => next && setChosen(next)}
          >
            ›
          </DayArrow>
        </DayArrows>
      </PanelHead>

      {rows.length === 0 ? (
        <Empty>{t('recurring.nothing')}</Empty>
      ) : (
        <Rows single={rows.length < 4}>
          {rows.map(({ activity, occurrence, pattern }) => {
            const multiDay =
              occurrence.endDate && occurrence.endDate !== occurrence.startDate;
            const ongoing = isOngoing(occurrence);
            const picture = getImageUrl(activity.images?.[0], 'small');
            return (
              <li
                key={activity._id + occurrence.startDate + occurrence.startTime}
              >
                <Row to={entryLink(activity, occurrence)}>
                  {picture && <Picture alt="" loading="lazy" src={picture} />}
                  <Time>
                    {multiDay
                      ? occurrence.startTime
                      : timeSpan(occurrence.startTime, occurrence.endTime)}
                  </Time>
                  <What>
                    <strong
                      style={
                        activity.cancelledAt
                          ? { textDecoration: 'line-through' }
                          : undefined
                      }
                    >
                      {activity.title}
                    </strong>
                    <small>{placeText(activity, placeOf)}</small>
                  </What>
                  {activity.cancelledAt ? (
                    <Pill kind="cancelled">{t('event.cancelled.tag')}</Pill>
                  ) : ongoing ? (
                    <Pill kind="now">{t('recurring.now')}</Pill>
                  ) : pattern ? (
                    <Pill kind="recurring">
                      {describeDays(pattern, t, i18n.language)}
                    </Pill>
                  ) : null}
                </Row>
              </li>
            );
          })}
        </Rows>
      )}
    </Panel>
  );
}

// What happens every week: the seven weekdays, Monday first, each with the
// recurring activities of that weekday. No dates and no today: it is the
// rhythm of a week, not a calendar. A weekday with nothing is just its name.
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export function WeeklySchedule({ activities, placeOf }: OverviewProps) {
  const [t] = useTranslation('common');
  const entryLink = useEntryLink();
  const todayKey = dayjs().format('YYYY-MM-DD');
  // the patterns that are still running
  const recurring = useMemo(
    () =>
      withPatterns(activities).filter(
        ({ pattern }) => pattern.until >= todayKey
      ),
    [activities, todayKey]
  );

  if (recurring.length === 0) {
    return null;
  }

  // A slot leads to the activity's next time on that weekday, when it has
  // one then; otherwise to the activity as it is.
  const linkFor = (
    activity: Activity,
    pattern: WeeklyPattern,
    weekday: number,
    startTime: string
  ) => {
    const today = dayjs(todayKey);
    const date = today
      .add((weekday - today.day() + 7) % 7, 'day')
      .format('YYYY-MM-DD');
    const happens =
      pattern.from <= date &&
      pattern.until >= date &&
      !pattern.skipped.includes(date);
    return happens
      ? entryLink(activity, { startDate: date, startTime })
      : entryLink(activity);
  };

  return (
    <section aria-labelledby="weekly-title">
      <SectionHead>
        <SectionTitle id="weekly-title">
          {t('recurring.weekTitle')}
        </SectionTitle>
      </SectionHead>
      <Week>
        {WEEKDAYS.map((weekday) => {
          const slots = recurring
            .flatMap(({ activity, pattern }) =>
              pattern.slots
                .filter((slot) => slot.weekday === weekday)
                .map((slot) => ({ activity, pattern, slot }))
            )
            .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
          return (
            <Day key={weekday} css={{ background: dayColor(weekday) }}>
              <DayName>{t(`recurring.weekdays.${weekday}`)}</DayName>
              {slots.map(({ activity, pattern, slot }) => (
                <Slot
                  key={activity._id + slot.startTime}
                  to={linkFor(activity, pattern, weekday, slot.startTime)}
                >
                  <b>{timeSpan(slot.startTime, slot.endTime)}</b>
                  <strong
                    style={
                      activity.cancelledAt
                        ? { textDecoration: 'line-through' }
                        : undefined
                    }
                  >
                    {activity.title}
                  </strong>
                  <small>
                    {[
                      activity.cancelledAt ? t('event.cancelled.tag') : null,
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

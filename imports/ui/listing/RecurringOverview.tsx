import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAtomValue } from 'jotai';
import { Helmet } from 'react-helmet';

import { styled } from '/stitches.config';
import { renderedAtom } from '/imports/state';
import {
  getWeeklyPattern,
  WeeklyPattern,
} from '/imports/api/activities/recurrence';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

import { getEntryPath } from './useOpenEntry';
import {
  describeDays,
  describePattern,
  timeSpan,
  weekdayName,
} from './recurringText';

// Two compact views for the front of the activities listing: what happens
// on one day (one line per activity), and the weekly rhythm of everything
// that recurs, shown once per weekday instead of one card per date.

const Panel = styled('section', {
  background: 'white',
  borderRadius: '14px',
  boxShadow:
    '0 1px 0 var(--cocoso-colors-theme-200), 0 10px 28px -18px rgba(0, 60, 10, 0.35)',
  margin: '0 auto 2rem',
  maxWidth: '1180px',
  padding: '1.1rem 1.4rem 0.6rem',
  '@media (max-width: 700px)': { padding: '0.9rem 1rem 0.4rem' },
});

const PanelHead = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  justifyContent: 'space-between',
  marginBottom: '0.4rem',
});

const PanelTitle = styled('h2', {
  fontSize: '1.3rem',
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
  padding: '0.65rem 0',
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
      recurring: {
        background: '#f7f2e4',
        border: '1px solid #9a7b3c',
        color: '#7a5f2a',
        fontStyle: 'italic',
      },
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
  padding: '0.9rem 0',
});

// The weekly schedule is drawn like a plate in a botanical atlas (after
// Botanicum): aged paper inside a fine double rule, serif lettering, each
// weekday a column and each activity a numbered specimen label.

const ink = 'var(--cocoso-colors-theme-800)';
const ochre = '#9a7b3c';
const paper = '#f7f2e4';
const serif =
  "'Cormorant Garamond', 'EB Garamond', Garamond, Georgia, 'Times New Roman', serif";

const Plate = styled('section', {
  background: `radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.6), transparent 60%),
    radial-gradient(ellipse at 90% 100%, rgba(154,123,60,0.08), transparent 55%), ${paper}`,
  border: `1px solid ${ink}`,
  boxShadow: `inset 0 0 0 5px ${paper}, inset 0 0 0 6px ${ink}, 0 12px 30px -22px rgba(40, 50, 20, 0.6)`,
  color: ink,
  margin: '0 auto 2.5rem',
  maxWidth: '1180px',
  padding: '1.75rem 1.75rem 1.5rem',
  '@media (max-width: 900px)': { padding: '1.4rem 1rem 1.2rem' },
});

const PlateHead = styled('header', {
  marginBottom: '1.25rem',
  textAlign: 'center',
});

const PlateNumber = styled('p', {
  color: ochre,
  fontFamily: serif,
  fontSize: '0.85rem',
  fontStyle: 'italic',
  letterSpacing: '0.12em',
  margin: '0 0 0.2rem',
});

const TitleRow = styled('div', {
  alignItems: 'center',
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  '& svg': { flexShrink: 0 },
  '@media (max-width: 600px)': { '& svg': { display: 'none' } },
});

const SectionTitle = styled('h2', {
  fontFamily: serif,
  fontSize: '2rem',
  fontWeight: 600,
  letterSpacing: '0.22em',
  lineHeight: 1.1,
  margin: 0,
  textTransform: 'uppercase',
});

const SectionIntro = styled('p', {
  fontFamily: serif,
  fontSize: '1.1rem',
  fontStyle: 'italic',
  margin: '0.35rem 0 0',
  opacity: 0.8,
});

const Week = styled('div', {
  borderTop: `1px solid ${ink}`,
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  paddingTop: '0.9rem',
  '@media (max-width: 900px)': {
    display: 'flex',
    overflowX: 'auto',
    padding: '0.9rem 0.5rem 0.4rem 0',
    scrollSnapType: 'x mandatory',
  },
});

const Day = styled('div', {
  borderLeft: '1px solid rgba(30, 60, 30, 0.25)',
  minHeight: '10rem',
  padding: '0 0.55rem',
  '&:first-child': { borderLeft: 'none' },
  '@media (max-width: 900px)': {
    flex: '0 0 62%',
    scrollSnapAlign: 'start',
  },
});

const DayName = styled('h3', {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: serif,
  fontSize: '1.15rem',
  fontStyle: 'italic',
  fontWeight: 500,
  margin: '0 0 0.7rem',
  textTransform: 'capitalize',
  '& small': {
    color: ochre,
    fontSize: '0.7rem',
    fontStyle: 'normal',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  variants: {
    today: { true: { fontWeight: 700 } },
  },
});

const Slot = styled(Link, {
  background: 'rgba(255, 255, 255, 0.7)',
  border: '1px solid rgba(30, 60, 30, 0.55)',
  color: 'inherit',
  display: 'block',
  marginBottom: '0.6rem',
  padding: '0.55rem 0.55rem 0.5rem',
  position: 'relative',
  textDecoration: 'none',
  transition: 'transform 0.15s, box-shadow 0.15s',
  '&:hover': {
    boxShadow: '0 4px 12px -6px rgba(40, 50, 20, 0.5)',
    transform: 'translateY(-1px)',
  },
  '& b': {
    display: 'block',
    fontFamily: serif,
    fontSize: '0.9rem',
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontWeight: 600,
    letterSpacing: '0.04em',
    marginBottom: '0.1rem',
    opacity: 0.85,
  },
  '& strong': {
    display: 'block',
    fontFamily: serif,
    fontSize: '1.08rem',
    fontWeight: 600,
    lineHeight: 1.15,
  },
  '& small': {
    display: 'block',
    fontFamily: serif,
    fontSize: '0.85rem',
    fontStyle: 'italic',
    lineHeight: 1.25,
    marginTop: '0.2rem',
    opacity: 0.8,
  },
  variants: {
    today: { true: { borderColor: ink, boxShadow: `inset 0 0 0 1px ${ink}` } },
  },
});

// The specimen number, as on the key of a botanical plate.
const Specimen = styled('span', {
  alignItems: 'center',
  background: paper,
  border: `1px solid ${ochre}`,
  borderRadius: '50%',
  color: ochre,
  display: 'flex',
  fontFamily: serif,
  fontSize: '0.8rem',
  fontStyle: 'italic',
  fontWeight: 600,
  height: '1.35rem',
  justifyContent: 'center',
  position: 'absolute',
  right: '-0.45rem',
  top: '-0.45rem',
  width: '1.35rem',
});

// The key below the plate: every specimen with its rhythm.
const Key = styled('footer', {
  borderTop: `1px solid ${ink}`,
  fontFamily: serif,
  marginTop: '0.9rem',
  paddingTop: '0.7rem',
  '& h4': {
    color: ochre,
    fontSize: '0.8rem',
    fontStyle: 'italic',
    fontWeight: 500,
    letterSpacing: '0.12em',
    margin: '0 0 0.35rem',
  },
  '& ol': {
    columnGap: '2rem',
    columns: '3 16rem',
    fontSize: '0.98rem',
    margin: 0,
    padding: 0,
  },
  '& li': {
    breakInside: 'avoid',
    listStyle: 'none',
    marginBottom: '0.15rem',
  },
  '& li span': { color: ochre, fontStyle: 'italic', marginRight: '0.4rem' },
  '& li em': { opacity: 0.75 },
});

const Fallow = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  opacity: 0.35,
  paddingTop: '1.5rem',
});

// A line-drawn sprig: a stem with alternating leaves.
function Sprig({
  flip = false,
  width = 110,
}: {
  flip?: boolean;
  width?: number;
}) {
  const leaves = [18, 34, 50, 66, 82];
  return (
    <svg
      aria-hidden="true"
      height={width * 0.32}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      viewBox="0 0 110 36"
      width={width}
    >
      <path
        d="M2 20 C 30 17, 70 23, 104 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1"
      />
      {leaves.map((x, i) => {
        const up = i % 2 === 0;
        const y = 20 - (x / 104) * 1.5;
        const d = up
          ? `M${x} ${y} q 4 -11 15 -13 q -3 11 -15 13 z`
          : `M${x} ${y} q 4 11 15 13 q -3 -11 -15 -13 z`;
        return (
          <g key={x}>
            <path
              d={d}
              fill="var(--cocoso-colors-theme-200)"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <path
              d={up ? `M${x} ${y} l 10 -9` : `M${x} ${y} l 10 9`}
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </g>
        );
      })}
      <circle cx="105" cy="18" fill={ochre} r="2.2" />
    </svg>
  );
}

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
  const [t, i18n] = useTranslation('common');
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

  // Specimen numbers follow the order the activities first appear in the week.
  const specimenOf = new Map<string, number>();
  weekOrder.forEach((weekday) =>
    recurring
      .filter(({ pattern }) => pattern.slots.some((s) => s.weekday === weekday))
      .sort((x, y) =>
        (
          x.pattern.slots.find((s) => s.weekday === weekday)?.startTime || ''
        ).localeCompare(
          y.pattern.slots.find((s) => s.weekday === weekday)?.startTime || ''
        )
      )
      .forEach(({ activity }) => {
        if (!specimenOf.has(activity._id)) {
          specimenOf.set(activity._id, specimenOf.size + 1);
        }
      })
  );

  return (
    <Plate aria-labelledby="weekly-title">
      <Helmet>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <PlateHead>
        <PlateNumber>{t('recurring.plate')}</PlateNumber>
        <TitleRow>
          <Sprig />
          <SectionTitle id="weekly-title">
            {t('recurring.weekTitle')}
          </SectionTitle>
          <Sprig flip />
        </TitleRow>
        <SectionIntro>{t('recurring.weekIntro')}</SectionIntro>
      </PlateHead>
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
            <Day key={weekday} data-today={isToday || undefined}>
              <DayName today={isToday}>
                <span>{weekdayName(weekday, 'dddd')}</span>
                {isToday && <small>{t('recurring.today')}</small>}
              </DayName>
              {slots.length === 0 && (
                <Fallow>
                  <Sprig width={70} />
                </Fallow>
              )}
              {slots.map(({ activity, pattern, slot }) => (
                <Slot
                  key={activity._id}
                  today={isToday}
                  to={entryLink(activity)}
                >
                  <Specimen>{specimenOf.get(activity._id)}</Specimen>
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
      <Key>
        <h4>{t('recurring.key')}</h4>
        <ol>
          {[...specimenOf.entries()].map(([id, number]) => {
            const item = recurring.find(({ activity }) => activity._id === id);
            if (!item) return null;
            return (
              <li key={id}>
                <span>{number}.</span>
                <Link
                  style={{ color: 'inherit' }}
                  to={entryLink(item.activity)}
                >
                  {item.activity.title}
                </Link>{' '}
                <em>– {describePattern(item.pattern, t, i18n.language)}</em>
              </li>
            );
          })}
        </ol>
      </Key>
    </Plate>
  );
}

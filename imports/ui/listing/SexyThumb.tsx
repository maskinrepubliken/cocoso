import { Meteor } from 'meteor/meteor';
import React, { memo } from 'react';
import dayjs from 'dayjs';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { styled } from '/stitches.config';
import {
  getNextOccurrence,
  getWeeklyPattern,
} from '/imports/api/activities/recurrence';
import { locationsAtom } from '/imports/state';
import { worldForLocation } from '/imports/ui/utils/locationPalette';

import PlaceholderImage from '../generic/PlaceholderImage';
import PlaceTag from '../generic/PlaceTag';
import { getImageUrl } from '../utils/imageHelper';
import { describePattern } from './recurringText';

const isClient = Meteor?.isClient;

if (isClient) {
  import 'react-lazy-load-image-component/src/effects/black-and-white.css';
}

// Computed per render, not per module load: the server runs for weeks and
// would otherwise keep the day it started on.
const dayBounds = () => ({
  today: dayjs().format('YYYY-MM-DD'),
  yesterday: dayjs().add(-1, 'days').format('YYYY-MM-DD'),
  tomorrow: dayjs().add(1, 'days').format('YYYY-MM-DD'),
});

// An event card: the picture fills the card, the date sits top-left as a
// paper label like a page of an almanac, the place top-right as its tag,
// and the title lies on a warm darkening fade at the bottom.
const Card = styled('article', {
  aspectRatio: '4 / 3',
  background: 'var(--cocoso-colors-theme-700)',
  borderRadius: 'var(--cocoso-radius-kort)',
  boxShadow: 'var(--cocoso-skugga-kort)',
  color: 'white',
  overflow: 'hidden',
  position: 'relative',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  width: '100%',
  '&:hover': {
    boxShadow: '0 18px 30px -14px rgba(60, 40, 20, 0.55)',
    transform: 'translateY(-3px)',
  },
  '&:hover img': { transform: 'scale(1.04)' },
  variants: {
    world: {
      skog: { background: 'linear-gradient(160deg, #cfe3b5, #4f8a5c)' },
      lera: { background: 'linear-gradient(160deg, #e2c6a8, #8a5a3a)' },
      glas: { background: 'linear-gradient(160deg, #cfe0ea, #3f6b7a)' },
      ockra: { background: 'linear-gradient(160deg, #e9dcc4, #9a7a33)' },
      salvia: { background: 'linear-gradient(160deg, #c3d1b8, #5a7a5a)' },
      none: {},
    },
  },
});

const Picture = styled('div', {
  inset: 0,
  position: 'absolute',
  '& img, & .lazy-load-image-background': {
    display: 'block !important',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease',
    width: '100%',
  },
  '&::after': {
    background:
      'linear-gradient(180deg, rgba(42, 37, 32, 0) 38%, rgba(42, 37, 32, 0.8) 100%)',
    content: '""',
    inset: 0,
    position: 'absolute',
  },
});

const Shapes = styled('div', {
  inset: 0,
  mixBlendMode: 'multiply',
  opacity: 0.55,
  position: 'absolute',
});

const Body = styled('div', {
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  left: 0,
  padding: '0.75rem 0.9rem 0.85rem',
  position: 'absolute',
  right: 0,
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
});

const Title = styled('h3', {
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontSize: '1.3rem',
  fontWeight: 600,
  letterSpacing: '-0.005em',
  lineHeight: 1.15,
  margin: 0,
});

const SubTitle = styled('p', {
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.82rem',
  fontWeight: 500,
  lineHeight: 1.3,
  margin: 0,
  opacity: 0.92,
});

const Meta = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.3rem',
  paddingTop: '0.1rem',
});

const Chip = styled('span', {
  background: 'rgba(255, 253, 247, 0.92)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.74rem',
  fontWeight: 600,
  padding: '0.15rem 0.55rem',
  textShadow: 'none',
  whiteSpace: 'nowrap',
  variants: {
    place: {
      true: {
        background: 'rgba(255, 255, 255, 0.18)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        color: 'white',
      },
    },
    past: { true: { color: 'var(--cocoso-mylla-soft)' } },
  },
});

const More = styled('span', {
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.8rem',
  fontWeight: 700,
});

const Rule = styled('span', {
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.82rem',
  fontWeight: 600,
  '& small': { fontWeight: 500, marginLeft: '0.35rem', opacity: 0.85 },
});

const TopLeft = styled('div', {
  left: '0.7rem',
  position: 'absolute',
  top: '0.7rem',
  zIndex: 1,
});

const TopRight = styled('div', {
  position: 'absolute',
  right: '0.7rem',
  top: '0.7rem',
  zIndex: 1,
});

// The almanac label: day in Fraunces, month in small caps in tegel.
const DateLabel = styled('span', {
  background: 'var(--cocoso-papper)',
  borderRadius: '10px',
  boxShadow: 'var(--cocoso-skugga)',
  color: 'var(--cocoso-mylla)',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  lineHeight: 1,
  minWidth: '2.6rem',
  padding: '0.4rem 0.5rem 0.35rem',
  textShadow: 'none',
  '& b': {
    fontFamily: 'var(--cocoso-font-display)',
    fontVariationSettings: '"SOFT" 60',
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  '& small': {
    color: 'var(--cocoso-tegel)',
    fontFamily: 'var(--cocoso-font-ui)',
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    marginTop: '3px',
    textTransform: 'uppercase',
  },
  variants: {
    past: { true: { color: 'var(--cocoso-mylla-soft)', '& small': { color: 'var(--cocoso-mylla-soft)' } } },
  },
});

interface Occurrence {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
}

export interface ThumbDateProps {
  occurrence?: Occurrence;
}

// "3 okt", or "3–5 okt" for an occurrence over several days.
export function ThumbDate({ occurrence }: ThumbDateProps) {
  if (!occurrence) {
    return null;
  }
  const isPast = dayjs(occurrence.endDate)?.isBefore(dayBounds().today);
  const start = dayjs(occurrence.startDate);
  const label =
    occurrence.startDate === occurrence.endDate
      ? start.format('D MMM')
      : `${start.format('D MMM')} – ${dayjs(occurrence.endDate).format(
          'D MMM'
        )}`;
  return <Chip past={isPast}>{label}</Chip>;
}

function AlmanacDate({ occurrence }: ThumbDateProps) {
  if (!occurrence) {
    return null;
  }
  const isPast = dayjs(occurrence.endDate)?.isBefore(dayBounds().today);
  const start = dayjs(occurrence.startDate);
  const multi = occurrence.startDate !== occurrence.endDate;
  return (
    <DateLabel past={isPast}>
      <b>{multi ? `${start.format('D')}–${dayjs(occurrence.endDate).format('D')}` : start.format('D')}</b>
      <small>{start.format('MMM').replace('.', '')}</small>
    </DateLabel>
  );
}

// A weekly activity shows its rhythm and next date instead of a row of dates.
function ThumbRule({ dates }: { dates: Occurrence[] }) {
  const [t, i18n] = useTranslation('common');
  const pattern = getWeeklyPattern(dates);
  const next = getNextOccurrence(dates, dayBounds().today);
  if (!pattern || !next) {
    return null;
  }
  return (
    <Rule>
      ↻ {describePattern(pattern, t, i18n.language)}
      <small>
        {t('recurring.next', { date: dayjs(next.startDate).format('D MMM') })}
      </small>
    </Rule>
  );
}

interface Activity {
  _id?: string;
  datesAndTimes?: Occurrence[];
  readingMaterial?: string;
  subTitle?: string;
  tag?: string;
  title?: string;
  images?: string[];
  imageUrl?: string;
  locationId?: string | null;
  isMunicipalityOnly?: boolean;
}

export interface SexyThumbProps {
  activity: Activity;
  index?: number;
  showPast?: boolean;
  tags?: string[];
}

function SexyThumb({
  activity,
  index,
  showPast = false,
  tags,
}: SexyThumbProps) {
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');

  if (!activity) {
    return null;
  }

  const { datesAndTimes, readingMaterial, subTitle, title } = activity;
  // Resolve image: handles both legacy URLs and new Images collection references
  const imageRef = (activity.images && activity.images[0]) || activity.imageUrl;
  const imageUrl = getImageUrl(imageRef, 'medium');

  const place = locations.find((l) => l._id === activity.locationId);
  const world = worldForLocation(locations, activity.locationId);
  const placeName =
    place?.name ||
    (activity.isMunicipalityOnly ? tc('locations.municipalityOnlyShort') : null);

  const { yesterday, tomorrow } = dayBounds();
  const dates = datesAndTimes || [];
  const futureDates = dates.filter((date) =>
    dayjs(date.endDate, 'YYYY-MM-DD').isAfter(yesterday)
  );
  const pastDates = dates.filter((date) =>
    dayjs(date.endDate, 'YYYY-MM-DD').isBefore(tomorrow)
  );
  const remainingFuture = futureDates.length - 3;
  const remainingPast = pastDates.length - 1;
  const isWeekly =
    !showPast && futureDates.length > 0 && Boolean(getWeeklyPattern(dates));
  const headline = showPast ? pastDates[pastDates.length - 1] : futureDates[0];

  return (
    <Card world={world?.key || 'skog'}>
      <Picture>
        {imageUrl ? (
          <LazyLoadImage
            alt={title}
            effect="black-and-white"
            src={imageUrl}
            visibleByDefault={index < 6}
          />
        ) : (
          <Shapes>
            <PlaceholderImage
              seed={activity._id || title}
              style={{ height: '100%', width: '100%' }}
            />
          </Shapes>
        )}
      </Picture>

      {headline && !isWeekly && (
        <TopLeft>
          <AlmanacDate occurrence={headline} />
        </TopLeft>
      )}
      {placeName && (
        <TopRight>
          <PlaceTag name={placeName} world={world} onImage />
        </TopRight>
      )}

      <Body>
        <Title>{title}</Title>
        {(subTitle || readingMaterial) && (
          <SubTitle>{subTitle || readingMaterial}</SubTitle>
        )}
        {tags && tags.length > 0 && (
          <Meta>
            {tags.map((t) => (
              <Chip key={t} place>
                {t}
              </Chip>
            ))}
          </Meta>
        )}

        <Meta>
          {isWeekly && <ThumbRule dates={dates} />}
          {!showPast &&
            !isWeekly &&
            futureDates
              .slice(1, 3)
              .map((occurrence) => (
                <ThumbDate
                  key={occurrence.startDate + occurrence.startTime}
                  occurrence={occurrence}
                />
              ))}
          {!showPast && !isWeekly && remainingFuture > 0 && (
            <More>+{remainingFuture}</More>
          )}
          {showPast && remainingPast > 0 && <More>+{remainingPast}</More>}
        </Meta>
      </Body>
    </Card>
  );
}

export default memo(SexyThumb);

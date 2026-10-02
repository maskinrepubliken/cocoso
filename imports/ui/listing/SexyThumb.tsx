import { Meteor } from 'meteor/meteor';
import React, { memo } from 'react';
import dayjs from 'dayjs';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import {
  getNextOccurrence,
  getWeeklyPattern,
} from '/imports/api/activities/recurrence';

import PlaceholderImage from '../generic/PlaceholderImage';
import { getImageUrl } from '../utils/imageHelper';
import { describePattern } from './recurringText';

const isClient = Meteor?.isClient;

if (isClient) {
  import 'react-lazy-load-image-component/src/effects/black-and-white.css';
}

const today = dayjs().format('YYYY-MM-DD');
const yesterday = dayjs(new Date()).add(-1, 'days').format('YYYY-MM-DD');
const tomorrow = dayjs(new Date()).add(1, 'days').format('YYYY-MM-DD');

// An event card: the picture fills the card and the facts lie on it, on a
// darkening gradient at the bottom.
const Card = styled('article', {
  aspectRatio: '4 / 3',
  background: 'var(--cocoso-colors-theme-700)',
  borderRadius: 'var(--cocoso-border-radius)',
  boxShadow: '0 6px 18px -12px rgba(20, 50, 25, 0.5)',
  color: 'white',
  overflow: 'hidden',
  position: 'relative',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  width: '100%',
  '&:hover': {
    boxShadow: '0 12px 24px -12px rgba(20, 50, 25, 0.6)',
    transform: 'translateY(-2px)',
  },
  '&:hover img': { transform: 'scale(1.04)' },
});

const Picture = styled('div', {
  inset: 0,
  position: 'absolute',
  '& img, & .lazy-load-image-background': {
    display: 'block !important',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.4s ease',
    width: '100%',
  },
  '&::after': {
    background:
      'linear-gradient(180deg, rgba(8, 24, 12, 0.05) 30%, rgba(8, 24, 12, 0.82) 100%)',
    content: '""',
    inset: 0,
    position: 'absolute',
  },
});

const Body = styled('div', {
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  left: 0,
  padding: '0.7rem 0.85rem 0.75rem',
  position: 'absolute',
  right: 0,
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.45)',
});

const Title = styled('h3', {
  fontSize: '1.08rem',
  fontWeight: 700,
  lineHeight: 1.2,
  margin: 0,
});

const SubTitle = styled('p', {
  fontSize: '0.85rem',
  lineHeight: 1.3,
  margin: 0,
  opacity: 0.92,
});

const Meta = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.3rem',
  paddingTop: '0.2rem',
});

const Chip = styled('span', {
  background: 'rgba(255, 255, 255, 0.92)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '0.1rem 0.5rem',
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
    past: { true: { color: 'var(--cocoso-colors-gray-600)' } },
  },
});

const More = styled('span', {
  fontSize: '0.8rem',
  fontWeight: 700,
});

const Rule = styled('span', {
  fontSize: '0.82rem',
  fontWeight: 600,
  '& small': { fontWeight: 500, marginLeft: '0.35rem', opacity: 0.85 },
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
  const isPast = dayjs(occurrence.endDate)?.isBefore(today);
  const start = dayjs(occurrence.startDate);
  const label =
    occurrence.startDate === occurrence.endDate
      ? start.format('D MMM')
      : `${start.format('D MMM')} – ${dayjs(occurrence.endDate).format(
          'D MMM'
        )}`;
  return <Chip past={isPast}>{label}</Chip>;
}

// A weekly activity shows its rhythm and next date instead of a row of dates.
function ThumbRule({ dates }: { dates: Occurrence[] }) {
  const [t, i18n] = useTranslation('common');
  const pattern = getWeeklyPattern(dates);
  const next = getNextOccurrence(dates, today);
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
  if (!activity) {
    return null;
  }

  const { datesAndTimes, readingMaterial, subTitle, title } = activity;
  // Resolve image: handles both legacy URLs and new Images collection references
  const imageRef = (activity.images && activity.images[0]) || activity.imageUrl;
  const imageUrl = getImageUrl(imageRef, 'medium');

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

  return (
    <Card>
      <Picture>
        {imageUrl ? (
          <LazyLoadImage
            alt={title}
            effect="black-and-white"
            src={imageUrl}
            visibleByDefault={index < 6}
          />
        ) : (
          <PlaceholderImage
            seed={activity._id || title}
            style={{ height: '100%', width: '100%' }}
          />
        )}
      </Picture>

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
              .slice(0, 3)
              .map((occurrence) => (
                <ThumbDate
                  key={occurrence.startDate + occurrence.startTime}
                  occurrence={occurrence}
                />
              ))}
          {!showPast && !isWeekly && remainingFuture > 0 && (
            <More>+{remainingFuture}</More>
          )}
          {showPast &&
            pastDates
              .slice(0, 1)
              .map((occurrence) => (
                <ThumbDate
                  key={occurrence.startDate + occurrence.startTime}
                  occurrence={occurrence}
                />
              ))}
          {showPast && remainingPast > 0 && <More>+{remainingPast}</More>}
        </Meta>
      </Body>
    </Card>
  );
}

export default memo(SexyThumb);

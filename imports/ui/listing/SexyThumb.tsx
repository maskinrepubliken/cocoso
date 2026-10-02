import { Meteor } from 'meteor/meteor';
import React, { memo } from 'react';
import dayjs from 'dayjs';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import { Flex, Tag } from '/imports/ui/core';
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

// An event card: a long, narrow picture on top and the facts below it,
// small enough for several cards per row.
const Card = styled('article', {
  background: 'white',
  borderRadius: 'var(--cocoso-border-radius)',
  boxShadow:
    '0 1px 2px rgba(0, 0, 0, 0.06), 0 6px 18px -12px rgba(20, 50, 25, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  width: '100%',
  '&:hover': {
    boxShadow:
      '0 2px 4px rgba(0, 0, 0, 0.08), 0 12px 24px -12px rgba(20, 50, 25, 0.45)',
    transform: 'translateY(-2px)',
  },
});

const Picture = styled('div', {
  aspectRatio: '5 / 2',
  background: 'var(--cocoso-colors-theme-200)',
  overflow: 'hidden',
  width: '100%',
  '& img, & .lazy-load-image-background': {
    display: 'block !important',
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
});

const Body = styled('div', {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: '0.3rem',
  padding: '0.7rem 0.85rem 0.8rem',
});

const Title = styled('h3', {
  color: 'var(--cocoso-colors-theme-900)',
  fontSize: '1.05rem',
  fontWeight: 700,
  lineHeight: 1.2,
  margin: 0,
});

const SubTitle = styled('p', {
  color: 'var(--cocoso-colors-gray-700)',
  fontSize: '0.85rem',
  lineHeight: 1.3,
  margin: 0,
});

const Meta = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.3rem',
  marginTop: 'auto',
  paddingTop: '0.35rem',
});

const DateChip = styled('span', {
  background: 'var(--cocoso-colors-theme-50)',
  border: '1px solid var(--cocoso-colors-theme-200)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  fontSize: '0.78rem',
  fontWeight: 600,
  padding: '0.12rem 0.5rem',
  whiteSpace: 'nowrap',
  variants: { past: { true: { color: 'var(--cocoso-colors-gray-500)' } } },
});

const More = styled('span', {
  color: 'var(--cocoso-colors-theme-700)',
  fontSize: '0.8rem',
  fontWeight: 600,
});

const Rule = styled('span', {
  color: 'var(--cocoso-colors-theme-800)',
  fontSize: '0.82rem',
  fontWeight: 600,
  '& small': { fontWeight: 500, marginLeft: '0.35rem', opacity: 0.75 },
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
  return <DateChip past={isPast}>{label}</DateChip>;
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
          <Flex gap="1" wrap="wrap">
            {tags.map((t) => (
              <Tag key={t} colorScheme="gray" size="sm">
                {t}
              </Tag>
            ))}
          </Flex>
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

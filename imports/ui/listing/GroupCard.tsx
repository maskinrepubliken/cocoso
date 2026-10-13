import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import UsersIcon from 'lucide-react/dist/esm/icons/users';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import LockIcon from 'lucide-react/dist/esm/icons/lock';

import { styled } from '/stitches.config';
import { locationsAtom } from '/imports/state';
import { worldForLocation } from '/imports/ui/utils/locationPalette';

import PlaceholderImage from '../generic/PlaceholderImage';
import PlaceTag from '../generic/PlaceTag';
import { getImageUrl } from '../utils/imageHelper';

// A förening as a paper card: its picture on top with the place's tag,
// then the name, one line about it, and who and when underneath. The same
// shape as the place cards, so the two listings read as one site.
const Card = styled('article', {
  background: 'var(--cocoso-papper)',
  borderRadius: 'var(--cocoso-radius-kort)',
  boxShadow: 'var(--cocoso-skugga-kort)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  '&:hover': {
    boxShadow: '0 18px 30px -14px rgba(60, 40, 20, 0.5)',
    transform: 'translateY(-3px)',
  },
  '&:hover img': { transform: 'scale(1.04)' },
});

const Picture = styled('div', {
  aspectRatio: '16 / 10',
  background: 'var(--cocoso-colors-theme-100)',
  overflow: 'hidden',
  position: 'relative',
  '& img': {
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease',
    width: '100%',
  },
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

const Shapes = styled('div', {
  inset: 0,
  mixBlendMode: 'multiply',
  opacity: 0.55,
  position: 'absolute',
});

const TopRight = styled('div', {
  position: 'absolute',
  right: '0.7rem',
  top: '0.7rem',
  zIndex: 1,
});

const Body = styled('div', {
  display: 'flex',
  flex: '1 1 auto',
  flexDirection: 'column',
  gap: '0.35rem',
  padding: '0.85rem 1rem 0.95rem',
});

const Title = styled('h3', {
  color: 'var(--cocoso-mylla)',
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontSize: '1.2rem',
  fontWeight: 600,
  letterSpacing: '-0.005em',
  lineHeight: 1.15,
  hyphens: 'auto',
  margin: 0,
  overflowWrap: 'break-word',
});

const Blurb = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  display: '-webkit-box',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.86rem',
  lineHeight: 1.4,
  margin: 0,
  overflow: 'hidden',
  '-webkit-box-orient': 'vertical',
  '-webkit-line-clamp': 2,
});

const Meta = styled('div', {
  alignItems: 'center',
  color: 'var(--cocoso-mylla-soft)',
  display: 'flex',
  flexWrap: 'wrap',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.78rem',
  fontWeight: 600,
  gap: '0.3rem 0.9rem',
  marginTop: 'auto',
  paddingTop: '0.4rem',
  '& span': { alignItems: 'center', display: 'inline-flex', gap: '0.3rem' },
  '& .is-soon': { color: 'var(--cocoso-tegel-600, var(--cocoso-tegel))' },
});

interface Group {
  _id: string;
  title: string;
  readingMaterial?: string;
  imageUrl?: string;
  locationId?: string | null;
  isMunicipalityOnly?: boolean;
  isPrivate?: boolean;
  members?: unknown[];
  datesAndTimes?: { startDate: string; startTime?: string }[];
}

export interface GroupCardProps {
  group: Group;
  index?: number;
}

export default function GroupCard({ group, index = 0 }: GroupCardProps) {
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');

  const imageUrl = getImageUrl(group.imageUrl, 'medium');
  const place = locations.find((l) => l._id === group.locationId);
  const world = worldForLocation(locations, group.locationId);
  const placeName =
    place?.name ||
    (group.isMunicipalityOnly ? tc('locations.municipalityOnlyShort') : null);
  const memberCount = group.members?.length || 0;
  const next = group.datesAndTimes?.[0];
  const nextIsSoon =
    next && dayjs(next.startDate).diff(dayjs().startOf('day'), 'day') <= 7;

  return (
    <Card>
      <Picture world={world?.key || 'none'}>
        {imageUrl ? (
          <img
            alt=""
            loading={index < 6 ? 'eager' : 'lazy'}
            src={imageUrl}
          />
        ) : (
          <Shapes>
            <PlaceholderImage
              seed={group._id}
              style={{ height: '100%', width: '100%' }}
            />
          </Shapes>
        )}
        {placeName && (
          <TopRight>
            <PlaceTag name={placeName} world={world} onImage />
          </TopRight>
        )}
      </Picture>
      <Body>
        <Title>{group.title}</Title>
        {group.readingMaterial && <Blurb>{group.readingMaterial}</Blurb>}
        <Meta>
          {memberCount > 0 && (
            <span>
              <UsersIcon width={14} height={14} />
              {tc('groupCard.members', { count: memberCount })}
            </span>
          )}
          {next && (
            <span className={nextIsSoon ? 'is-soon' : undefined}>
              <CalendarIcon width={14} height={14} />
              {tc('groupCard.nextMeeting', {
                date: dayjs(next.startDate).format('D MMM'),
              })}
            </span>
          )}
          {group.isPrivate && (
            <span>
              <LockIcon width={14} height={14} />
              {tc('labels.private')}
            </span>
          )}
        </Meta>
      </Body>
    </Card>
  );
}

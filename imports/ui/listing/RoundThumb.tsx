import React from 'react';

import { useAtomValue } from 'jotai';

import { styled } from '/stitches.config';
import { locationsAtom } from '/imports/state';
import { worldForLocation } from '/imports/ui/utils/locationPalette';

import PlaceholderImage from '../generic/PlaceholderImage';
import { getImageUrl } from '../utils/imageHelper';

// Föreningar are drawn as circles so they stand apart from the event and
// place cards.
const Outer = styled('div', {
  aspectRatio: '1 / 1',
  background: 'var(--cocoso-colors-theme-700)',
  borderRadius: '50%',
  boxShadow: 'var(--cocoso-skugga-kort)',
  padding: '4px',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  width: '100%',
  '&:hover': { transform: 'scale(1.03)', boxShadow: '0 18px 30px -14px rgba(60, 40, 20, 0.5)' },
  '&:hover img': { transform: 'scale(1.06)' },
  '@media (max-width: 599px)': { padding: '3px' },
});

const Inner = styled('div', {
  borderRadius: '50%',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
  '& img': {
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.4s ease',
    width: '100%',
  },
  '&::after': {
    background:
      'linear-gradient(180deg, rgba(42, 37, 32, 0.12) 0%, rgba(42, 37, 32, 0.72) 100%)',
    content: '""',
    inset: 0,
    position: 'absolute',
  },
});

const Text = styled('div', {
  alignItems: 'center',
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  inset: '16% 13%',
  justifyContent: 'center',
  position: 'absolute',
  textAlign: 'center',
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
  zIndex: 1,
  '& h3': {
    fontFamily: 'var(--cocoso-font-display)',
    fontVariationSettings: '"SOFT" 60',
    fontSize: '1.35rem',
    fontWeight: 600,
    lineHeight: 1.12,
    margin: 0,
  },
  '& p': {
    fontSize: '0.85rem',
    lineHeight: 1.3,
    margin: '0.4rem 0 0',
    opacity: 0.95,
  },
  '@media (max-width: 599px)': {
    inset: '16% 9%',
    '& h3': { fontSize: '0.82rem' },
    '& p': { display: 'none' },
  },
  '@media (min-width: 600px) and (max-width: 1119px)': {
    '& h3': { fontSize: '1.05rem' },
  },
});

const Tags = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  justifyContent: 'center',
  marginTop: '0.6rem',
  '& span': {
    background: 'rgba(255, 253, 247, 0.92)',
    borderRadius: '999px',
    color: 'var(--cocoso-colors-theme-800)',
    fontFamily: 'var(--cocoso-font-ui)',
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '0.1rem 0.55rem',
    textShadow: 'none',
  },
});

interface RoundThumbProps {
  item: {
    _id: string;
    title: string;
    readingMaterial?: string;
    imageUrl?: string;
    locationId?: string | null;
  };
  tags?: string[];
}

export default function RoundThumb({ item, tags }: RoundThumbProps) {
  const imageUrl = getImageUrl(item.imageUrl, 'medium');
  const locations = useAtomValue(locationsAtom);
  const world = worldForLocation(locations, item.locationId);

  return (
    <Outer css={world ? { background: world.ink } : undefined}>
      <Inner>
        {imageUrl ? (
          <img alt="" loading="lazy" src={imageUrl} />
        ) : (
          <PlaceholderImage
            seed={item._id}
            style={{ height: '100%', width: '100%' }}
          />
        )}
        <Text>
          <h3>{item.title}</h3>
          {item.readingMaterial && <p>{item.readingMaterial}</p>}
          {tags && tags.length > 0 && (
            <Tags>
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </Tags>
          )}
        </Text>
      </Inner>
    </Outer>
  );
}

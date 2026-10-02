import React from 'react';

import { styled } from '/stitches.config';

import PlaceholderImage from '../generic/PlaceholderImage';
import { getImageUrl } from '../utils/imageHelper';

// Föreningar are drawn as hexagons so they stand apart from the event and
// place cards. A pointy-top hexagon is 2/√3 times as tall as it is wide.
const hexagon =
  'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

const Outer = styled('div', {
  aspectRatio: '1 / 1.1547',
  background: 'var(--cocoso-colors-theme-700)',
  clipPath: hexagon,
  padding: '4px',
  transition: 'transform 0.2s ease',
  width: '270px',
  '&:hover': { transform: 'scale(1.03)' },
  '&:hover img': { transform: 'scale(1.06)' },
  // Two side by side on phones.
  '@media (max-width: 480px)': { padding: '3px', width: 'calc(50vw - 1.25rem)' },
});

const Inner = styled('div', {
  clipPath: hexagon,
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
      'linear-gradient(180deg, rgba(10, 30, 15, 0.15) 0%, rgba(10, 30, 15, 0.7) 100%)',
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
  inset: '18% 14%',
  justifyContent: 'center',
  position: 'absolute',
  textAlign: 'center',
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
  zIndex: 1,
  '& h3': {
    fontSize: '1.2rem',
    fontWeight: 700,
    lineHeight: 1.15,
    margin: 0,
  },
  '& p': {
    fontSize: '0.85rem',
    lineHeight: 1.3,
    margin: '0.4rem 0 0',
    opacity: 0.95,
  },
  '@media (max-width: 480px)': {
    inset: '16% 10%',
    '& h3': { fontSize: '0.92rem' },
    '& p': { display: 'none' },
  },
});

const Tags = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  justifyContent: 'center',
  marginTop: '0.6rem',
  '& span': {
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '999px',
    color: 'var(--cocoso-colors-theme-800)',
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '0.1rem 0.55rem',
    textShadow: 'none',
  },
});

interface HexThumbProps {
  item: {
    _id: string;
    title: string;
    readingMaterial?: string;
    imageUrl?: string;
  };
  tags?: string[];
}

export default function HexThumb({ item, tags }: HexThumbProps) {
  const imageUrl = getImageUrl(item.imageUrl, 'medium');

  return (
    <Outer>
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

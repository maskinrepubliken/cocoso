import React from 'react';

import { styled } from '/stitches.config';

// The page lays its sections out in two columns on wide screens and in a
// single column, in reading order, on narrow ones.
export const WIDE = '@media (min-width: 900px)';
export const NARROW = '@media (max-width: 899px)';

const SectionBox = styled('section', {
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: 'var(--cocoso-radius-kort)',
  boxShadow: 'var(--cocoso-skugga)',
  padding: '1.25rem 1.5rem',
  // Scrolled to (the sign-up button at the top): clear of the header
  scrollMarginTop: '5rem',
  wordBreak: 'break-word',
  variants: {
    // Something inside reaches the card's edges, e.g. a map on top.
    bleed: { true: { overflow: 'hidden' } },
    look: {
      // A part of a larger card: no card of its own, a line above it
      plain: {
        backgroundColor: 'transparent',
        borderRadius: 0,
        borderTop: '1px solid var(--cocoso-colors-theme-100)',
        boxShadow: 'none',
        padding: '1.5rem 0 0',
        '&:first-child': { borderTop: 'none', paddingTop: 0 },
      },
      // The organizer's own tools: dark, so they are not taken for part
      // of what visitors see. What lies in it reads its colours from
      // these variables.
      dark: {
        '--cocoso-mylla': '#fffdf7',
        '--cocoso-mylla-soft': 'rgba(255, 253, 247, 0.72)',
        '--cocoso-papper': 'transparent',
        '--cocoso-linje': 'rgba(255, 253, 247, 0.4)',
        '--cocoso-tegel': '#f0b89a',
        '--cocoso-lingon': '#ffaaa5',
        '--cocoso-lingon-100': 'rgba(255, 140, 130, 0.16)',
        '--cocoso-colors-theme-100': 'rgba(255, 253, 247, 0.14)',
        '--cocoso-colors-theme-700': '#fffdf7',
        backgroundColor: '#1d2a1b',
        boxShadow: '0 10px 30px -12px rgba(20, 30, 15, 0.55)',
        color: '#fffdf7',
      },
    },
  },
});

const SectionHeader = styled('div', {
  alignItems: 'baseline',
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'space-between',
  marginBottom: '0.875rem',
});

export const SectionTitle = styled('h2', {
  color: 'var(--cocoso-tegel)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  margin: 0,
  textTransform: 'uppercase',
});

const SectionAside = styled('span', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.875rem',
});

interface SectionProps {
  // Leave out to place the title yourself, e.g. under a map.
  title?: React.ReactNode;
  aside?: React.ReactNode;
  bleed?: boolean;
  // Other than a card of its own: see SectionBox
  look?: 'plain' | 'dark';
  // Position in the single-column layout on narrow screens.
  order: number;
  id?: string;
  children: React.ReactNode;
}

export default function Section({
  title,
  aside,
  order,
  id,
  bleed,
  look,
  children,
}: SectionProps) {
  return (
    <SectionBox bleed={bleed} id={id} look={look} css={{ [NARROW]: { order } }}>
      {(title || aside) && (
        <SectionHeader>
          <SectionTitle>{title}</SectionTitle>
          {aside && <SectionAside>{aside}</SectionAside>}
        </SectionHeader>
      )}
      {children}
    </SectionBox>
  );
}

// Small shared pieces of text styling.
export const Muted = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.875rem',
  margin: 0,
});

export const Strong = styled('p', {
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontSize: '1.25rem',
  fontWeight: 600,
  lineHeight: 1.2,
  margin: '0 0 0.35rem',
});

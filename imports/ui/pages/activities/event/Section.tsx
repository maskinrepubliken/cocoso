import React from 'react';

import { styled } from '/stitches.config';

// The page lays its sections out in two columns on wide screens and in a
// single column, in reading order, on narrow ones.
export const WIDE = '@media (min-width: 900px)';
export const NARROW = '@media (max-width: 899px)';

const SectionBox = styled('section', {
  backgroundColor: 'white',
  border: '1px solid var(--cocoso-colors-theme-100)',
  borderRadius: 'var(--cocoso-border-radius)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  padding: '1.25rem 1.5rem',
  wordBreak: 'break-word',
});

const SectionHeader = styled('div', {
  alignItems: 'baseline',
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'space-between',
  marginBottom: '0.875rem',
});

const SectionTitle = styled('h2', {
  color: 'var(--cocoso-colors-theme-800)',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  margin: 0,
  textTransform: 'uppercase',
});

const SectionAside = styled('span', {
  color: 'var(--cocoso-colors-gray-600)',
  fontSize: '0.875rem',
});

interface SectionProps {
  title: React.ReactNode;
  aside?: React.ReactNode;
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
  children,
}: SectionProps) {
  return (
    <SectionBox id={id} css={{ [NARROW]: { order } }}>
      <SectionHeader>
        <SectionTitle>{title}</SectionTitle>
        {aside && <SectionAside>{aside}</SectionAside>}
      </SectionHeader>
      {children}
    </SectionBox>
  );
}

// Small shared pieces of text styling.
export const Muted = styled('p', {
  color: 'var(--cocoso-colors-gray-600)',
  fontSize: '0.875rem',
  margin: 0,
});

export const Strong = styled('p', {
  fontSize: '1.05rem',
  fontWeight: 700,
  margin: '0 0 0.25rem',
});

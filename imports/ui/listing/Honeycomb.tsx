import React from 'react';

import { styled } from '/stitches.config';

// Packs round cards the way a honeycomb packs its cells: rows alternate
// between n and n - 1 circles, every other row starts half a step in and
// sits in the dips of the row above.
//
// A grid of half-step columns does it in CSS alone: every circle spans two
// columns, and the first circle of each shorter row is moved to the second
// column, which pushes that row half a step to the right. Rows are √3/2 of
// a step apart and the circles overflow into the next row.
//
//   --s  circle diameter   --g  gap   --h  card height

const columns = (n: number) =>
  `repeat(${2 * n}, calc((var(--s) - var(--g)) / 2))`;

const Wrap = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
});

const Comb = styled('div', {
  '--s': '150px',
  '--g': '6px',
  '--h': 'var(--s)',
  columnGap: 'var(--g)',
  display: 'grid',
  gridAutoRows: 'calc((var(--s) + var(--g)) * 0.866)',
  gridTemplateColumns: columns(2),
  paddingBottom: 'calc(var(--s) * 0.134)',
  '& > *': {
    display: 'block !important',
    gridColumnEnd: 'span 2',
    height: 'var(--h)',
    width: 'var(--s) !important',
  },
  // Two per row on phones: rows of 2 and 1.
  '& > *:nth-child(3n + 3)': { gridColumnStart: 2 },
  '@media (min-width: 600px)': { '--s': '200px', '--g': '8px' },
  // Rows of 3 and 2.
  '@media (min-width: 680px)': {
    gridTemplateColumns: columns(3),
    '& > *:nth-child(3n + 3)': { gridColumnStart: 'auto' },
    '& > *:nth-child(5n + 4)': { gridColumnStart: 2 },
  },
  // Rows of 4 and 3.
  '@media (min-width: 1120px)': {
    '--s': '230px',
    gridTemplateColumns: columns(4),
    '& > *:nth-child(5n + 4)': { gridColumnStart: 'auto' },
    '& > *:nth-child(7n + 5)': { gridColumnStart: 2 },
  },
});

export default function Honeycomb({ children }: { children: React.ReactNode }) {
  return (
    <Wrap>
      <Comb>{children}</Comb>
    </Wrap>
  );
}

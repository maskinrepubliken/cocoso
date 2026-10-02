import React from 'react';

import { styled } from '/stitches.config';

// Lays hexagons out as a honeycomb: rows alternate between n and n - 1
// hexagons, every other row starts half a hexagon in, and the rows overlap
// by a quarter of a hexagon's height so the shapes fit into each other.
//
// A grid of half-hexagon columns does it in CSS alone: every hexagon spans
// two columns, and the first hexagon of each shorter row is moved to the
// second column, which pushes that row half a step to the right. Rows are
// three quarters of a hexagon tall and the hexagons overflow into the next.
//
//   --s  hexagon width   --g  gap   --h  hexagon height (2/√3 × width)

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
  '--h': 'calc(var(--s) * 1.1547)',
  columnGap: 'var(--g)',
  display: 'grid',
  gridAutoRows: 'calc(var(--h) * 0.75 + var(--g) * 0.866)',
  gridTemplateColumns: columns(2),
  paddingBottom: 'calc(var(--h) * 0.25)',
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

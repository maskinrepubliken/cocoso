import { styled } from '/stitches.config';

// The kinds at the top of a listing as tiles to filter by, each in its own
// colour with an icon, a count and a line about it: Förfrågningar's kinds,
// and what is offered on Äta, handla och bo. Pass the tile's colour as
// its background, and the icon's as KindIcon's.

const ink = '#151515';
const green = 'var(--cocoso-colors-theme-800)';

// On a phone the kinds are one row you swipe, with the next one peeking in
// from the edge, so the list of requests starts within the first screen.
export const Kinds = styled('div', {
  display: 'grid',
  gap: '0.6rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  marginBottom: '1.5rem',
  '@media (max-width: 600px)': {
    display: 'flex',
    gap: '0.5rem',
    margin: '0 calc(-1 * var(--cocoso-gutter)) 1.25rem',
    overflowX: 'auto',
    padding: '4px var(--cocoso-gutter) 8px',
    scrollbarWidth: 'none',
    scrollPadding: '0 var(--cocoso-gutter)',
    scrollSnapType: 'x proximity',
    '&::-webkit-scrollbar': { display: 'none' },
  },
});

export const KindTile = styled('button', {
  all: 'unset',
  border: '2px solid transparent',
  borderRadius: '16px',
  boxShadow: '0 8px 20px -16px rgba(60, 35, 10, 0.5)',
  boxSizing: 'border-box',
  color: ink,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  padding: '0.8rem 0.9rem',
  transition: 'transform 0.15s ease, border-color 0.15s ease',
  '&:hover': { transform: 'translateY(-2px)' },
  '&:focus-visible': { outline: `2px solid ${green}`, outlineOffset: '2px' },
  variants: {
    selected: { true: { borderColor: green } },
    dimmed: { true: { opacity: 0.55 } },
  },
  '@media (max-width: 600px)': {
    flex: '0 0 auto',
    gap: '0.4rem',
    padding: '0.6rem 0.75rem',
    scrollSnapAlign: 'start',
    width: '128px',
  },
});

export const KindHead = styled('span', {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
});

export const KindIcon = styled('span', {
  alignItems: 'center',
  background: green,
  borderRadius: '999px',
  color: 'white',
  display: 'inline-flex',
  height: '2.1rem',
  justifyContent: 'center',
  width: '2.1rem',
  '& svg': { height: '1.15rem', width: '1.15rem' },
  '@media (max-width: 600px)': {
    height: '1.8rem',
    width: '1.8rem',
    '& svg': { height: '1rem', width: '1rem' },
  },
});

export const KindCount = styled('span', {
  background: 'rgba(255, 255, 255, 0.6)',
  borderRadius: '999px',
  fontSize: '0.8rem',
  fontWeight: 700,
  padding: '0.1rem 0.5rem',
});

export const KindName = styled('span', {
  fontSize: '1.02rem',
  fontWeight: 700,
  '@media (max-width: 600px)': { fontSize: '0.92rem', whiteSpace: 'nowrap' },
});

export const KindText = styled('span', {
  fontSize: '0.82rem',
  lineHeight: 1.35,
  opacity: 0.85,
  '@media (max-width: 600px)': { display: 'none' },
});

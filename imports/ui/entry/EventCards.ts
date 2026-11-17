import { styled } from '/stitches.config';

// Events as the listing's cards; also on a place's page
const EventCards = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
});

export default EventCards;

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';

import Section, { Muted, Strong } from './Section';
import { Occurrence, formatOccurrence, isPastOccurrence } from './occurrences';

const maxShown = 8;

const Chips = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
  marginTop: '0.875rem',
});

const Chip = styled('button', {
  backgroundColor: 'var(--cocoso-papper)',
  border: '1px solid var(--cocoso-colors-theme-200)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
  lineHeight: 1,
  padding: '0.45rem 0.75rem',
  transition: 'background-color 0.15s, color 0.15s',
  '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-50)' },
  variants: {
    selected: {
      true: {
        backgroundColor: 'var(--cocoso-colors-theme-500)',
        borderColor: 'var(--cocoso-colors-theme-500)',
        color: 'white',
        '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-600)' },
      },
    },
  },
});

const MoreButton = styled('button', {
  background: 'none',
  border: 'none',
  color: 'var(--cocoso-colors-theme-700)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  marginTop: '0.625rem',
  padding: 0,
  textDecoration: 'underline',
});

interface WhenSectionProps {
  dates: Occurrence[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

// The selected date in full, and for recurring events the dates to choose
// between. Past dates are only offered when every date has passed.
export default function WhenSection({
  dates,
  selectedIndex,
  onSelect,
}: WhenSectionProps) {
  const [tc] = useTranslation('common');
  const [showAll, setShowAll] = useState(false);
  const selected = dates[selectedIndex];

  const indexed = dates.map((d, index) => ({ ...d, index }));
  const upcoming = indexed.filter((d) => !isPastOccurrence(d));
  const choices = upcoming.length > 0 ? upcoming : indexed;
  const shown = showAll ? choices : choices.slice(0, maxShown);
  if (!shown.some((d) => d.index === selectedIndex) && selected) {
    shown.unshift({ ...selected, index: selectedIndex });
  }

  return (
    <Section
      aside={
        dates.length > 1
          ? tc('event.dates.occurrences', { count: dates.length })
          : null
      }
      order={1}
      title={tc('event.sections.when')}
    >
      {selected && (
        <>
          <Strong css={{ '&::first-letter': { textTransform: 'uppercase' } }}>
            {formatOccurrence(selected)}
          </Strong>
          {isPastOccurrence(selected) && (
            <Muted>{tc('event.register.past')}</Muted>
          )}
        </>
      )}

      {choices.length > 1 && (
        <>
          <Chips aria-label={tc('event.dates.choose')} role="group">
            {shown.map((d) => (
              <Chip
                key={d.index}
                aria-pressed={d.index === selectedIndex}
                selected={d.index === selectedIndex}
                type="button"
                onClick={() => onSelect(d.index)}
              >
                {dayjs(d.startDate).format('D MMM')}
              </Chip>
            ))}
          </Chips>
          {choices.length > maxShown && (
            <MoreButton type="button" onClick={() => setShowAll(!showAll)}>
              {showAll
                ? tc('event.dates.fewer')
                : tc('event.dates.more', { count: choices.length })}
            </MoreButton>
          )}
        </>
      )}
    </Section>
  );
}

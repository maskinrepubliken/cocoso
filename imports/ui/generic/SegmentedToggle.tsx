import React from 'react';

import { styled } from '/stitches.config';

// The pill of choices first seen on the start page ("Idag" / "Imorgon"):
// one chosen at a time, the chosen one filled in green. On a card or in a
// form (`onPaper`) the pill gets a pale green ground to stand out from
// the white.
const Segmented = styled('div', {
  background: 'rgba(255, 253, 247, 0.7)',
  borderRadius: '999px',
  display: 'inline-flex',
  flexWrap: 'wrap',
  maxWidth: '100%',
  padding: '3px',
  variants: {
    onPaper: {
      true: { background: 'var(--cocoso-colors-theme-100)' },
    },
  },
});

const SegButton = styled('button', {
  background: 'transparent',
  border: 0,
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  cursor: 'pointer',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.875rem',
  fontWeight: 700,
  padding: '0.35rem 0.95rem',
  transition: 'background-color 0.15s ease',
  variants: {
    active: {
      true: { background: 'var(--cocoso-colors-theme-700)', color: 'white' },
    },
  },
});

interface SegmentedToggleProps<T extends string> {
  value: T;
  choices: { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
  onPaper?: boolean;
}

export default function SegmentedToggle<T extends string>({
  value,
  choices,
  onChange,
  label,
  onPaper = false,
}: SegmentedToggleProps<T>) {
  return (
    <Segmented aria-label={label} onPaper={onPaper} role="group">
      {choices.map((choice) => (
        <SegButton
          key={choice.value}
          active={choice.value === value}
          aria-pressed={choice.value === value}
          type="button"
          onClick={() => onChange(choice.value)}
        >
          {choice.label}
        </SegButton>
      ))}
    </Segmented>
  );
}

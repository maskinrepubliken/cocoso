import React from 'react';

export interface Choice<T extends string> {
  value: T;
  label: string;
  // A picture or icon before the label
  icon?: React.ReactNode;
  // A line under the row about the chosen one
  description?: string;
  disabled?: boolean;
  // What the chosen one brings in, under the row
  content?: React.ReactNode;
}

interface ChoiceChipsProps<T extends string> {
  label: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
}

// A choice between a few ways of filling something in: a row of chips,
// the chosen one filled, and what it brings shown underneath.
export default function ChoiceChips<T extends string>({
  label,
  value,
  choices,
  onChange,
}: ChoiceChipsProps<T>) {
  const chosen = choices.find((choice) => choice.value === value);
  return (
    <div className="choice">
      <div className="choice-chips" role="radiogroup" aria-label={label}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={choice.value === value}
            className={`choice-chip ${
              choice.value === value ? 'is-chosen' : ''
            }`}
            disabled={choice.disabled}
            title={choice.disabled ? choice.description : undefined}
            onClick={() => onChange(choice.value)}
          >
            {choice.icon}
            <span>{choice.label}</span>
          </button>
        ))}
      </div>
      {chosen?.description && (
        <p className="choice-description">{chosen.description}</p>
      )}
      {chosen?.content && <div className="choice-body">{chosen.content}</div>}
    </div>
  );
}

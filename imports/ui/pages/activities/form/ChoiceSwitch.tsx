import React from 'react';

export interface Choice<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface ChoiceSwitchProps<T extends string> {
  choices: Choice<T>[];
  value: T;
  label: string;
  onChange: (value: T) => void;
}

// A choice between a few ways of filling something in ("Arrangörens" /
// "Egna"), in the site's segmented switch, the same as Tidigare/Kommande.
export default function ChoiceSwitch<T extends string>({
  choices,
  value,
  label,
  onChange,
}: ChoiceSwitchProps<T>) {
  return (
    <div className="seg choice-switch" role="radiogroup" aria-label={label}>
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          role="radio"
          aria-checked={value === choice.value}
          className={`seg-button ${value === choice.value ? 'is-active' : ''}`}
          disabled={choice.disabled}
          onClick={() => onChange(choice.value)}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

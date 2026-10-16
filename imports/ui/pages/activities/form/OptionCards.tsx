import React from 'react';

export interface OptionCard<T extends string> {
  value: T;
  title: string;
  description?: string;
  disabled?: boolean;
  // What the choice brings in, shown inside the card while it is chosen
  content?: React.ReactNode;
}

interface OptionCardsProps<T extends string> {
  label: string;
  value: T;
  options: OptionCard<T>[];
  onChange: (value: T) => void;
}

// A choice between a few ways of filling something in, as a stack of
// cards: a radio mark, a title and a line saying what it means. The chosen
// card opens to show what it brings (the profile's details, or fields).
export default function OptionCards<T extends string>({
  label,
  value,
  options,
  onChange,
}: OptionCardsProps<T>) {
  return (
    <div className="option-cards" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <div
            key={option.value}
            className={`option-card ${chosen ? 'is-chosen' : ''} ${
              option.disabled ? 'is-disabled' : ''
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={chosen}
              className="option-card-head"
              disabled={option.disabled}
              onClick={() => onChange(option.value)}
            >
              <span className="option-card-dot" aria-hidden />
              <span className="option-card-text">
                <span className="option-card-title">{option.title}</span>
                {option.description && (
                  <span className="option-card-description">
                    {option.description}
                  </span>
                )}
              </span>
            </button>
            {chosen && option.content && (
              <div className="option-card-body">{option.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

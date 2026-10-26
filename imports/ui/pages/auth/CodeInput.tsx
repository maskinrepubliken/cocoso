import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const LENGTH = 6;

interface CodeInputProps {
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}

// Six boxes, one digit each. Typing moves on, backspace moves back, and a
// pasted or autofilled code (the first box carries one-time-code) fills
// them all at once.
export default function CodeInput({
  value,
  disabled,
  invalid,
  onChange,
}: CodeInputProps) {
  const [t] = useTranslation('accounts');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Emptied after a wrong code: back to the first box once it can be typed in
  useEffect(() => {
    if (!value && !disabled) {
      refs.current[0]?.focus();
    }
  }, [value, disabled]);

  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] || '');

  const focus = (index: number) => {
    const target = refs.current[Math.max(0, Math.min(LENGTH - 1, index))];
    target?.focus();
    target?.select();
  };

  const fill = (from: number, typed: string) => {
    const incoming = typed.replace(/\D/g, '');
    if (!incoming) {
      return;
    }
    // A whole code pasted into any box replaces everything
    if (incoming.length >= LENGTH) {
      onChange(incoming.slice(0, LENGTH));
      focus(LENGTH - 1);
      return;
    }
    const next = digits.slice();
    incoming.split('').forEach((digit, offset) => {
      if (from + offset < LENGTH) {
        next[from + offset] = digit;
      }
    });
    onChange(next.join('').slice(0, LENGTH));
    focus(from + incoming.length);
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const next = digits.slice();
      if (next[index]) {
        next[index] = '';
      } else if (index > 0) {
        next[index - 1] = '';
        focus(index - 1);
      }
      onChange(next.join(''));
    } else if (event.key === 'ArrowLeft') {
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      focus(index + 1);
    }
  };

  return (
    <div
      className="auth-code"
      data-invalid={invalid ? 'true' : undefined}
      role="group"
      aria-label={t('emailLogin.code.label')}
    >
      {digits.map((digit, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          aria-label={t('emailLogin.code.digit', { n: index + 1 })}
          aria-invalid={invalid || undefined}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={index === 0}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          type="text"
          value={digit}
          onChange={(event) => {
            let typed = event.target.value;
            // Typed over a digit that wasn't selected: keep the new one
            if (digit && typed.length === 2 && typed.startsWith(digit)) {
              typed = typed.slice(1);
            }
            fill(index, typed);
          }}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => {
            event.preventDefault();
            fill(index, event.clipboardData.getData('text'));
          }}
        />
      ))}
    </div>
  );
}

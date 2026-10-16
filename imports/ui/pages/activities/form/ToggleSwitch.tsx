import React, { useId } from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  label: string;
  helper?: string;
  onChange: (checked: boolean) => void;
}

// An on/off setting as a modern switch: the label and a line of help on
// the left, the switch on the right; the whole row toggles it.
export default function ToggleSwitch({
  checked,
  label,
  helper,
  onChange,
}: ToggleSwitchProps) {
  const id = useId();
  return (
    <div className="toggle-row">
      <span className="toggle-text">
        <label className="toggle-label" htmlFor={id}>
          {label}
        </label>
        {helper && <span className="toggle-helper">{helper}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle-switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-knob" aria-hidden />
      </button>
    </div>
  );
}

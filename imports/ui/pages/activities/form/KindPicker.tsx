import React from 'react';
import { useTranslation } from 'react-i18next';

import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';

import { EVENT_KINDS } from '../eventKinds';

interface KindPickerProps {
  value: string;
  onChange: (key: string) => void;
}

// The kind of event as the same 3D tiles as on the events page: tap one
// to choose it, tap it again to choose none.
export default function KindPicker({ value, onChange }: KindPickerProps) {
  const [tc] = useTranslation('common');
  return (
    <div
      className="kind-picker"
      role="radiogroup"
      aria-label={tc('eventKinds.form.label')}
    >
      {EVENT_KINDS.map((kind) => {
        const chosen = value === kind.key;
        return (
          <button
            key={kind.key}
            type="button"
            role="radio"
            aria-checked={chosen}
            className={`kind-picker-tile ${chosen ? 'is-active' : ''}`}
            onClick={() => onChange(chosen ? '' : kind.key)}
          >
            <ThreeDIcon name={kind.icon} size={36} />
            <span>{tc(`eventKinds.${kind.key}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

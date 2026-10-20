import React from 'react';
import { useTranslation } from 'react-i18next';

import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import type { ThreeDIconName } from '/imports/ui/generic/ThreeDIcon';

import { EVENT_KINDS } from '../eventKinds';

interface KindPickerProps {
  value: string;
  onChange: (key: string) => void;
  // Another list of kinds, e.g. the kinds of platser; defaults to the
  // kinds of evenemang. `namespace` is where their names live in
  // common.yml.
  kinds?: { key: string; icon: ThreeDIconName }[];
  namespace?: string;
}

// The kind of event (or place) as the same 3D tiles as on the listing:
// tap one to choose it, tap it again to choose none.
export default function KindPicker({
  value,
  onChange,
  kinds = EVENT_KINDS,
  namespace = 'eventKinds',
}: KindPickerProps) {
  const [tc] = useTranslation('common');
  return (
    <div
      className="kind-picker"
      role="radiogroup"
      aria-label={tc(`${namespace}.form.label`)}
    >
      {kinds.map((kind) => {
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
            <span>{tc(`${namespace}.${kind.key}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

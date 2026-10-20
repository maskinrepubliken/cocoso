import React from 'react';
import { useTranslation } from 'react-i18next';

import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import type { ThreeDIconName } from '/imports/ui/generic/ThreeDIcon';

import { EVENT_KINDS } from '../eventKinds';

interface KindPickerProps {
  value: string[];
  onChange: (keys: string[]) => void;
  // Another list of kinds, e.g. the kinds of platser; defaults to the
  // kinds of evenemang. `namespace` is where their names live in
  // common.yml.
  kinds?: { key: string; icon: ThreeDIconName }[];
  namespace?: string;
}

// The kinds of an event (or place) as the same 3D tiles as on the
// listing: tap one to add it, tap it again to take it away. Any number
// can be chosen, kept in the order of the tiles.
export default function KindPicker({
  value,
  onChange,
  kinds = EVENT_KINDS,
  namespace = 'eventKinds',
}: KindPickerProps) {
  const [tc] = useTranslation('common');
  const toggle = (key: string) =>
    onChange(
      kinds
        .map((kind) => kind.key)
        .filter((k) => (k === key ? !value.includes(k) : value.includes(k)))
    );
  return (
    <div
      className="kind-picker"
      role="group"
      aria-label={tc(`${namespace}.form.label`)}
    >
      {kinds.map((kind) => {
        const chosen = value.includes(kind.key);
        return (
          <button
            key={kind.key}
            type="button"
            aria-pressed={chosen}
            className={`kind-picker-tile ${chosen ? 'is-active' : ''}`}
            onClick={() => toggle(kind.key)}
          >
            <ThreeDIcon name={kind.icon} size={36} />
            <span>{tc(`${namespace}.${kind.key}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

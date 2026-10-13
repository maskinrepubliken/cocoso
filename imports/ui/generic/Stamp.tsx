import React from 'react';

import type { LocationWorld } from '/imports/ui/utils/locationPalette';

export interface StampProps {
  // The place's name, set in the ring
  name: string;
  world?: LocationWorld;
  // A second line inside the ring, such as a year or a landmark
  note?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// A place's stamp: a double ring with the name, in the manner of postmarks
// and village seals. Small on cards and tags, large on the place's page.
export default function Stamp({
  name,
  world,
  note,
  size = 'md',
  className = '',
}: StampProps) {
  const ink = world?.ink || 'var(--cocoso-colors-theme-700)';
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      className={`stamp stamp-${size} ${className}`}
      style={{ color: ink, ['--stamp-ink' as any]: ink }}
      aria-hidden="true"
    >
      {size === 'sm' ? (
        <span className="stamp-initial">{initial}</span>
      ) : (
        <span className="stamp-text">
          <span className="stamp-name">{name}</span>
          {note && <span className="stamp-note">{note}</span>}
        </span>
      )}
    </span>
  );
}

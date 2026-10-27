import React from 'react';

import type { LocationWorld } from '/imports/ui/utils/locationPalette';

export interface PlaceTagProps {
  name: string;
  world?: LocationWorld;
  // On a photo the tag is paper; on paper it takes the place's tint.
  onImage?: boolean;
  className?: string;
}

// A place's name as a small pill in the place's ink: the orttag. The name
// is enough; no initial or stamp beside it.
export default function PlaceTag({
  name,
  world,
  onImage = false,
  className = '',
}: PlaceTagProps) {
  const ink = world?.ink || 'var(--cocoso-colors-theme-700)';
  return (
    <span
      className={`place-tag ${onImage ? 'on-image' : ''} ${className}`}
      style={{ color: ink }}
    >
      {name}
    </span>
  );
}

import React from 'react';

import type { LocationWorld } from '/imports/ui/utils/locationPalette';

export interface PlaceTagProps {
  name: string;
  world?: LocationWorld;
  // On a photo the tag is paper; on paper it takes the place's tint.
  onImage?: boolean;
  className?: string;
}

// A place's name as a small pill with its stamp initial: the orttag.
export default function PlaceTag({
  name,
  world,
  onImage = false,
  className = '',
}: PlaceTagProps) {
  const ink = world?.ink || 'var(--cocoso-colors-theme-700)';
  const tint = world?.tint || 'var(--cocoso-colors-theme-100)';
  return (
    <span
      className={`place-tag ${onImage ? 'on-image' : ''} ${className}`}
      style={{ color: ink }}
    >
      <span className="place-tag-mark" style={{ background: tint, color: ink }}>
        {name.trim().charAt(0).toUpperCase()}
      </span>
      {name}
    </span>
  );
}

import React from 'react';

// Soft 3D icons from 3dicons.co (CC0), served from /public/3dicons as
// trimmed 320px WebP. Decorative by default; pass `alt` when the icon
// carries meaning on its own. `size` sets the width/height attributes, so
// CSS can still resize the icon per breakpoint.
export type ThreeDIconName =
  | 'at' | 'bag' | 'bell' | 'bookmark' | 'brush' | 'bulb' | 'boy' | 'calendar'
  | 'camera' | 'can' | 'card' | 'chat' | 'chess' | 'circle' | 'clock'
  | 'colour-palette' | 'computer' | 'crown' | 'cube' | 'cup' | 'file-text'
  | 'fire' | 'flag' | 'gift' | 'girl' | 'glass' | 'gym' | 'hash' | 'headphone'
  | 'heart' | 'key' | 'lab' | 'location' | 'lock' | 'magic-trick' | 'mail'
  | 'map-pin' | 'medal' | 'megaphone' | 'mic' | 'mobile' | 'money-bag'
  | 'music' | 'notebook' | 'paint-brush' | 'pencil' | 'picture' | 'pin'
  | 'plus' | 'puzzle' | 'rocket' | 'setting' | 'sphere' | 'star' | 'sun'
  | 'target' | 'tea-cup' | 'text' | 'tick' | 'tool' | 'travel' | 'trophy'
  | 'umbrella' | 'video-camera' | 'wallet' | 'zoom';

// One icon per section of the site, keyed by the menu item's name.
export const sectionIcons: Record<string, ThreeDIconName> = {
  activities: 'megaphone',
  calendar: 'calendar',
  groups: 'puzzle',
  works: 'picture',
  people: 'mic',
  resources: 'pin',
  info: 'notebook',
  requests: 'chat',
  members: 'boy',
};

export interface ThreeDIconProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  name: ThreeDIconName | string;
  size?: number;
  alt?: string;
}

export default function ThreeDIcon({
  name,
  size = 64,
  alt = '',
  className = '',
  style,
  ...rest
}: ThreeDIconProps) {
  return (
    <img
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`threed-icon ${className}`}
      decoding="async"
      draggable={false}
      height={size}
      loading="lazy"
      src={`/3dicons/${name}.webp`}
      style={style}
      width={size}
      {...rest}
    />
  );
}

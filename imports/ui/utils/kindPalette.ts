// One colour per kind of evenemang, for the calendar: a dark ink that
// reads on paper and a soft tint for the fill. Warm and muted like the
// rest of the site; nothing neon. Events without a kind take the site's
// green.
export interface KindColors {
  ink: string;
  tint: string;
}

const KIND_COLORS: Record<string, KindColors> = {
  kultur: { ink: '#6b3a7a', tint: '#ebdcef' }, // plum
  idrott: { ink: '#b8441f', tint: '#f6dccf' }, // brick red
  barn: { ink: '#a8701a', tint: '#f6e6c3' }, // honey
  bio: { ink: '#8a4a2a', tint: '#f1dfd0' }, // clay
  senior: { ink: '#9a3f5c', tint: '#f3d9e1' }, // dusty rose
  natur: { ink: '#1e4f1b', tint: '#dcebc6' }, // forest
  larande: { ink: '#2f5868', tint: '#dbe8ef' }, // glass blue
  social: { ink: '#2d7266', tint: '#d6ebe5' }, // teal
};

export const DEFAULT_KIND_COLORS: KindColors = {
  ink: 'var(--cocoso-colors-theme-700)',
  tint: 'var(--cocoso-colors-theme-100)',
};

export function colorsForKind(kind?: string | null): KindColors {
  return (kind && KIND_COLORS[kind]) || DEFAULT_KIND_COLORS;
}

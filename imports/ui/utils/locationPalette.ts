// Each place gets a colour world of its own, used on its cards, its stamp
// and its landing hero: forest for the first, clay (Väveriet's brick) for
// the second, glass blue (the glassworks) for the third, then ochre and
// sage for any more. Deterministic from the order admins gave the places,
// so a place keeps its colours everywhere.
export interface LocationWorld {
  key: 'skog' | 'lera' | 'glas' | 'ockra' | 'salvia';
  // Gradient ends for cards without a photo
  from: string;
  to: string;
  // Stamp / tag colour, dark enough to read on paper
  ink: string;
  // Soft tint for tags on paper
  tint: string;
}

const WORLDS: LocationWorld[] = [
  { key: 'skog', from: '#cfe3b5', to: '#4f8a5c', ink: '#1e4f1b', tint: '#dcebc6' },
  { key: 'lera', from: '#e2c6a8', to: '#8a5a3a', ink: '#8a4a2a', tint: '#f1dfd0' },
  { key: 'glas', from: '#cfe0ea', to: '#3f6b7a', ink: '#2f5868', tint: '#dbe8ef' },
  { key: 'ockra', from: '#e9dcc4', to: '#9a7a33', ink: '#6e5420', tint: '#efe6cd' },
  { key: 'salvia', from: '#c3d1b8', to: '#5a7a5a', ink: '#3f5a3f', tint: '#dde6d6' },
];

export function worldForIndex(index: number): LocationWorld {
  return WORLDS[((index % WORLDS.length) + WORLDS.length) % WORLDS.length];
}

export function worldForLocation(
  locations: { _id: string }[] | undefined,
  locationId?: string | null
): LocationWorld | undefined {
  if (!locations || !locationId) {
    return undefined;
  }
  const index = locations.findIndex((location) => location._id === locationId);
  return index === -1 ? undefined : worldForIndex(index);
}

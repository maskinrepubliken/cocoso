// Kinds (kultur, idrott, bad, …) are stored as a list of keys, `kinds`, on
// activities and resources: one can be several kinds at once. Documents
// saved before that carry a single one as category.key; read through
// kindsOf so both count.

interface WithKinds {
  kinds?: string[] | null;
  category?: { key?: string } | null;
}

export function kindsOf(item?: WithKinds | null): string[] {
  if (!item) return [];
  if (Array.isArray(item.kinds)) return item.kinds;
  return item.category?.key ? [item.category.key] : [];
}

// Only known keys, each once, in the order of `allowed` (the order the
// tiles are shown in).
export function cleanKinds(kinds: unknown, allowed: string[]): string[] {
  if (!Array.isArray(kinds)) return [];
  return allowed.filter((key) => kinds.includes(key));
}

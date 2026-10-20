import type { ThreeDIconName } from '/imports/ui/generic/ThreeDIcon';

// The kinds of platser, like the kinds of evenemang. The key is what is
// stored on the resource (category.key); names live in common.yml under
// resourceKinds.<key>. Each has one of the soft 3D icons for its chip.
export const RESOURCE_KINDS: { key: string; icon: ThreeDIconName }[] = [
  { key: 'kultur', icon: 'colour-palette' },
  { key: 'sevardhet', icon: 'sevardhet' },
  { key: 'idrottshall', icon: 'gym' },
  { key: 'idrottsplats', icon: 'fotboll' },
  { key: 'bad', icon: 'badring' },
  { key: 'friluft', icon: 'talt' },
];

export const RESOURCE_KIND_KEYS = RESOURCE_KINDS.map((kind) => kind.key);

export const findResourceKind = (key?: string | null) =>
  RESOURCE_KINDS.find((kind) => kind.key === key);

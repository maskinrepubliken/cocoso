import type { ThreeDIconName } from '/imports/ui/generic/ThreeDIcon';

// The kinds of evenemang an organizer can file an event under. The key is
// what is stored on the activity (category.key); names live in common.yml
// under eventKinds.<key>. Each has one of the soft 3D icons for its chip.
export const EVENT_KINDS: { key: string; icon: ThreeDIconName }[] = [
  { key: 'kultur', icon: 'music' },
  { key: 'idrott', icon: 'gym' },
  { key: 'barn', icon: 'girl' },
  { key: 'bio', icon: 'video-camera' },
  { key: 'senior', icon: 'heart' },
  { key: 'natur', icon: 'sun' },
  { key: 'larande', icon: 'bulb' },
  { key: 'social', icon: 'tea-cup' },
];

export const EVENT_KIND_KEYS = EVENT_KINDS.map((kind) => kind.key);

export const findEventKind = (key?: string | null) =>
  EVENT_KINDS.find((kind) => kind.key === key);

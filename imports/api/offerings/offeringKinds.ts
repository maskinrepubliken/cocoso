// What a place can offer, in the order of the tiles and sections on the
// Äta, handla och bo page and of the editor's choices: Mat & fika, Boende,
// Försäljning, Tjänster.
// Names live in common.yml under offerings.kinds.<key>.
export const OFFERING_KINDS = ['eat', 'stay', 'shop', 'service'] as const;

export type OfferingKind = (typeof OFFERING_KINDS)[number];

export const isOfferingKind = (kind: unknown): kind is OfferingKind =>
  typeof kind === 'string' &&
  (OFFERING_KINDS as readonly string[]).includes(kind);

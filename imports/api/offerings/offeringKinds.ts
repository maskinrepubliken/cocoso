// What a place can offer, in the order of the tabs and of the sections on
// the Äta, handla & bo page: Mat & fika, Boende, Tjänster, Försäljning.
// Names live in common.yml under offerings.kinds.<key>.
export const OFFERING_KINDS = ['eat', 'stay', 'service', 'shop'] as const;

export type OfferingKind = (typeof OFFERING_KINDS)[number];

export const isOfferingKind = (kind: unknown): kind is OfferingKind =>
  typeof kind === 'string' &&
  (OFFERING_KINDS as readonly string[]).includes(kind);

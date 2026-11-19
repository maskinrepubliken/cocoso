import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

import { Schemas } from '../_utils/schemas';
import Activities from '../activities/activity';

/**
 * A mirror copies the events of one place in another calendar into Cocoso
 * and keeps them up to date: new ones are added, changed ones rewritten,
 * cancelled ones marked and removed ones deleted (mirror.sync.ts). Set up
 * by an admin under Admin → Speglingar.
 *
 * The kinds:
 * - `axiell-events` reads the open event API behind Axiell Arena library
 *   sites, such as Knallebiblioteken's calendar (axiell.ts).
 * - `bio-se` reads a cinema's screenings at bio.se, one event for each
 *   (bioSe.ts).
 */
export type MirrorKind = 'axiell-events' | 'bio-se';

export interface MirrorDoc {
  _id: string;
  name: string;
  kind: MirrorKind;
  // The place at the source, as the source names it ("Tranemo bibliotek",
  // "Dalstorps Bio")
  sourceLocation: string;
  // The source's name for visitors ("Knallebiblioteken", "bio.se")
  sourceName: string;
  // axiell-events: the library group's customer id at Axiell, and the
  // address of an event's own page there, with {id} for the event's id
  customerId?: string;
  eventUrl?: string;
  // bio-se: the cinema at bio.se, its own site (linked from each event)
  // and whether there is leave to show the films' posters
  cinemaId?: number;
  cinemaSlug?: string;
  cinemaUrl?: string;
  hasPosterPermission?: boolean;
  // Where the events land in Cocoso: the place (and so the address and
  // location) and the account that organizes them
  resourceId: string;
  organizerId: string;
  // Kinds for an event whose tags give none
  defaultKinds?: string[];
  isEnabled: boolean;
  lastRun?: {
    at: Date;
    created: number;
    updated: number;
    removed: number;
    error?: string;
  };
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export const MIRROR_KINDS = ['axiell-events', 'bio-se'] as const;

const Mirrors = new Mongo.Collection<MirrorDoc>('mirrors');

(Mirrors as any).schema = new SimpleSchema({
  _id: Schemas.Id,
  name: { type: String },
  kind: { type: String, allowedValues: [...MIRROR_KINDS] },
  sourceLocation: { type: String },
  sourceName: { type: String },
  customerId: { type: String, optional: true },
  eventUrl: { type: String, optional: true },
  cinemaId: { type: SimpleSchema.Integer, optional: true },
  cinemaSlug: { type: String, optional: true },
  cinemaUrl: { type: String, optional: true },
  hasPosterPermission: { type: Boolean, optional: true },
  resourceId: { type: String },
  organizerId: { type: String },
  defaultKinds: { type: Array, optional: true },
  'defaultKinds.$': { type: String },
  isEnabled: { type: Boolean, defaultValue: false },
  lastRun: { type: Object, optional: true },
  'lastRun.at': { type: Date },
  'lastRun.created': { type: SimpleSchema.Integer },
  'lastRun.updated': { type: SimpleSchema.Integer },
  'lastRun.removed': { type: SimpleSchema.Integer },
  'lastRun.error': { type: String, optional: true },
  createdBy: { type: String, optional: true },
  createdAt: { type: Date },
  updatedAt: { type: Date, optional: true },
});

(Mirrors as any).attachSchema((Mirrors as any).schema);

if (Meteor.isServer) {
  Meteor.startup(async () => {
    // Each run looks every event up by where it came from
    await Activities.rawCollection().createIndex(
      { 'mirror.mirrorId': 1, 'mirror.externalId': 1 },
      { name: 'mirror_source', sparse: true }
    );
  });
}

export default Mirrors;

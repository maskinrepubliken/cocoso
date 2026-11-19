import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import Activities from '../activities/activity';
import Resources from '../resources/resource';
import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import { requireOrganizerContact } from '../activities/activity.organizers';
import { cleanKinds } from '../_utils/kinds';
import { EVENT_KIND_KEYS } from '../../ui/pages/activities/eventKinds';
import Mirrors, { MIRROR_KINDS, type MirrorDoc } from './mirror';
import { fetchAxiellLocations } from './axiell';
import { fetchBioSeCinemas } from './bioSe';
import { runMirrorAlone, syncMirror } from './mirror.sync';

// Admin → Speglingar: setting mirrors up, trying them and running them.
// Admins only.

async function requireAdmin() {
  const user = await Meteor.userAsync();
  if (!user || !(await isAdmin(user._id))) {
    throw new Meteor.Error('not-allowed', 'You are not allowed');
  }
  return user;
}

const valuesPattern = {
  name: String,
  kind: Match.Where((kind: unknown) =>
    (MIRROR_KINDS as readonly unknown[]).includes(kind)
  ),
  sourceLocation: Match.Maybe(String),
  sourceName: String,
  customerId: Match.Maybe(String),
  eventUrl: Match.Maybe(String),
  cinemaId: Match.Maybe(Match.Integer),
  cinemaSlug: Match.Maybe(String),
  cinemaUrl: Match.Maybe(String),
  hasPosterPermission: Match.Maybe(Boolean),
  resourceId: String,
  organizerId: String,
  defaultKinds: Match.Maybe([String]),
  isEnabled: Boolean,
};

type MirrorValues = Pick<
  MirrorDoc,
  | 'name'
  | 'kind'
  | 'sourceLocation'
  | 'sourceName'
  | 'customerId'
  | 'eventUrl'
  | 'cinemaId'
  | 'cinemaSlug'
  | 'cinemaUrl'
  | 'hasPosterPermission'
  | 'resourceId'
  | 'organizerId'
  | 'defaultKinds'
  | 'isEnabled'
>;

// What says where the events come from, for the mirror's kind: checked,
// and without the other kind's values
async function cleanSource(values: MirrorValues) {
  if (values.kind === 'bio-se') {
    // The cinema as bio.se lists it, not as the form names it
    let cinemas;
    try {
      cinemas = await fetchBioSeCinemas();
    } catch (error) {
      throw new Meteor.Error(
        'source-unreachable',
        `The source could not be read: ${(error as Error)?.message}`
      );
    }
    const cinema = cinemas.find((c) => c.id === values.cinemaId);
    if (!cinema) {
      throw new Meteor.Error('missing-values', 'Please choose a cinema');
    }
    const cinemaUrl = (values.cinemaUrl || '').trim();
    if (cinemaUrl && !/^https?:\/\/\S+$/.test(cinemaUrl)) {
      throw new Meteor.Error(
        'invalid-cinema-url',
        "The address of the cinema's own site must start with http:// or https://"
      );
    }
    return {
      sourceLocation: cinema.name,
      cinemaId: cinema.id,
      cinemaSlug: cinema.slug,
      cinemaUrl,
      hasPosterPermission: Boolean(values.hasPosterPermission),
    };
  }
  const source = {
    customerId: (values.customerId || '').trim(),
    sourceLocation: (values.sourceLocation || '').trim(),
    eventUrl: (values.eventUrl || '').trim(),
  };
  if (!source.customerId || !source.sourceLocation) {
    throw new Meteor.Error('missing-values', 'Please fill in every field');
  }
  if (
    !/^https:\/\/\S+$/.test(source.eventUrl) ||
    !source.eventUrl.includes('{id}')
  ) {
    throw new Meteor.Error(
      'invalid-event-url',
      'The address of an event must start with https:// and hold {id}'
    );
  }
  return source;
}

// The values as stored, after checking that the place and the organizer
// are there, and that the organizer may organize and can be reached
async function cleanValues(values: MirrorValues): Promise<MirrorValues> {
  check(values, valuesPattern);
  const trimmed = {
    name: values.name.trim(),
    kind: values.kind,
    sourceName: values.sourceName.trim(),
    resourceId: values.resourceId,
    organizerId: values.organizerId,
    defaultKinds: cleanKinds(values.defaultKinds || [], EVENT_KIND_KEYS),
    isEnabled: values.isEnabled,
  };
  if (!trimmed.name || !trimmed.sourceName) {
    throw new Meteor.Error('missing-values', 'Please fill in every field');
  }
  if (!(await Resources.findOneAsync(trimmed.resourceId))) {
    throw new Meteor.Error('not-found', 'The place was not found');
  }
  if (!(await isContributorOrAdmin(trimmed.organizerId))) {
    throw new Meteor.Error(
      'not-found',
      'The organizer must be an organizer or an admin'
    );
  }
  await requireOrganizerContact([trimmed.organizerId]);
  return { ...trimmed, ...(await cleanSource(values)) };
}

async function findMirror(mirrorId: string) {
  check(mirrorId, String);
  const mirror = await Mirrors.findOneAsync(mirrorId);
  if (!mirror) {
    throw new Meteor.Error('not-found', 'Mirror not found');
  }
  return mirror;
}

Meteor.methods({
  async getMirrorsForAdmin() {
    await requireAdmin();
    const mirrors = await Mirrors.find({}, { sort: { name: 1 } }).fetchAsync();
    return Promise.all(
      mirrors.map(async (mirror) => ({
        ...mirror,
        activityCount: await Activities.find({
          'mirror.mirrorId': mirror._id,
        }).countAsync(),
      }))
    );
  },

  // The places with events at the source, for choosing one
  async getMirrorSourceLocations(customerId: string) {
    check(customerId, String);
    await requireAdmin();
    try {
      return await fetchAxiellLocations(customerId.trim());
    } catch (error) {
      throw new Meteor.Error(
        'source-unreachable',
        `The source could not be read: ${(error as Error)?.message}`
      );
    }
  },

  // The cinemas at bio.se, for choosing one
  async getBioSeCinemas() {
    await requireAdmin();
    try {
      return await fetchBioSeCinemas();
    } catch (error) {
      throw new Meteor.Error(
        'source-unreachable',
        `The source could not be read: ${(error as Error)?.message}`
      );
    }
  },

  async createMirror(values: MirrorValues) {
    const user = await requireAdmin();
    const clean = await cleanValues(values);
    return Mirrors.insertAsync({
      ...clean,
      createdBy: user._id,
      createdAt: new Date(),
    } as MirrorDoc);
  },

  async updateMirror(mirrorId: string, values: MirrorValues) {
    await requireAdmin();
    await findMirror(mirrorId);
    const clean = await cleanValues(values);
    await Mirrors.updateAsync(
      { _id: mirrorId },
      { $set: { ...clean, updatedAt: new Date() } }
    );
    return true;
  },

  async setMirrorEnabled(mirrorId: string, isEnabled: boolean) {
    check(isEnabled, Boolean);
    await requireAdmin();
    await findMirror(mirrorId);
    await Mirrors.updateAsync({ _id: mirrorId }, { $set: { isEnabled } });
    return true;
  },

  // The mirror goes; the events it made stay, as their organizer's own
  async removeMirror(mirrorId: string) {
    await requireAdmin();
    await findMirror(mirrorId);
    await Activities.updateAsync(
      { 'mirror.mirrorId': mirrorId },
      { $set: { 'mirror.isDetached': true } },
      { multi: true }
    );
    await Mirrors.removeAsync({ _id: mirrorId });
    return true;
  },

  // What a run would do now, writing nothing
  async previewMirror(mirrorId: string) {
    await requireAdmin();
    const mirror = await findMirror(mirrorId);
    try {
      return await syncMirror(mirror, { dryRun: true });
    } catch (error: any) {
      throw new Meteor.Error(
        error?.error === 'not-found' ? 'not-found' : 'source-unreachable',
        error?.reason || error?.message
      );
    }
  },

  // "Synka nu": a run at once, also of a mirror that is switched off
  async runMirrorNow(mirrorId: string) {
    await requireAdmin();
    const mirror = await findMirror(mirrorId);
    try {
      return await runMirrorAlone(mirror);
    } catch (error: any) {
      throw new Meteor.Error(
        error?.error === 'busy' ? 'busy' : 'mirror-failed',
        error?.reason || error?.message
      );
    }
  },
});

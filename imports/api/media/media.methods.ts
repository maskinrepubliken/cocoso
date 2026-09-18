import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';
import { check, Match } from 'meteor/check';

import {
  saveMedia,
  keyToUrl,
  mediaExists,
  sanitizeSegment,
} from '../_utils/services/mediaStorage';
import { getHost } from '../_utils/shared';
import { isAdmin } from '../users/user.roles';

/**
 * One-off migration from AWS S3 to local media storage.
 *
 * Walks every document in every collection, finds strings that contain S3
 * URLs (plain fields, arrays, nested objects and rich-text HTML alike),
 * downloads each file once into local storage and rewrites the references.
 *
 * Run from a browser console while logged in as a super admin:
 *
 *   Meteor.call('media.migrateFromS3', { dryRun: true }, console.log)
 *   Meteor.call('media.migrateFromS3', {}, console.log)
 *
 * The S3 objects are read over plain HTTPS, so the buckets must still be
 * publicly readable while this runs. URLs that cannot be fetched are left
 * untouched and listed in the result.
 */

const S3_URL_PATTERN =
  /https?:\/\/[a-z0-9.-]*s3[a-z0-9.-]*\.amazonaws\.com\/[^\s"'<>()\\]+/gi;

const SKIP_COLLECTIONS = new Set(['migrations', 'meteor_accounts_loginServiceConfiguration']);

interface MigrationOptions {
  dryRun?: boolean;
  collections?: string[];
}

interface MigrationResult {
  dryRun: boolean;
  collectionsScanned: string[];
  documentsUpdated: number;
  urlsFound: number;
  filesDownloaded: number;
  filesAlreadyPresent: number;
  failures: { url: string; reason: string }[];
}

/**
 * Map an S3 object URL to a local storage key.
 * Keys already in our `images/...` or `documents/...` layout keep their path;
 * anything else lands under `legacy/<bucket>/...`.
 */
export function s3UrlToKey(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const hostParts = parsed.hostname.split('.');
  let bucket: string;
  let objectKey: string;
  const rawPath = parsed.pathname.replace(/^\/+/, '');

  if (hostParts[0] === 's3' || hostParts[0].startsWith('s3-')) {
    // https://s3.<region>.amazonaws.com/<bucket>/<key>
    const [first, ...rest] = rawPath.split('/');
    bucket = first;
    objectKey = rest.join('/');
  } else {
    // https://<bucket>.s3.<region>.amazonaws.com/<key>
    bucket = hostParts[0];
    objectKey = rawPath;
  }
  if (!bucket || !objectKey) return null;

  const segments = objectKey
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .map(sanitizeSegment);

  if (segments[0] === 'images' || segments[0] === 'documents') {
    return segments.join('/');
  }
  return ['legacy', sanitizeSegment(bucket), ...segments].join('/');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Recursively replace S3 URLs inside strings. Returns the new value and
 * whether anything changed. Non-plain objects (Date, ObjectId, ...) are kept.
 */
export function rewriteValue(
  value: unknown,
  urlMap: Map<string, string>
): { value: unknown; changed: boolean } {
  if (typeof value === 'string') {
    if (!/amazonaws\.com/i.test(value)) return { value, changed: false };
    const next = value.replace(S3_URL_PATTERN, (match) => urlMap.get(match) || match);
    return { value: next, changed: next !== value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = rewriteValue(item, urlMap);
      if (result.changed) changed = true;
      return result.value;
    });
    return { value: changed ? next : value, changed };
  }
  if (isPlainObject(value)) {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const result = rewriteValue(v, urlMap);
      if (result.changed) changed = true;
      next[k] = result.value;
    }
    return { value: changed ? next : value, changed };
  }
  return { value, changed: false };
}

function collectUrls(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    if (!/amazonaws\.com/i.test(value)) return;
    for (const match of value.match(S3_URL_PATTERN) || []) {
      into.add(match);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, into));
  } else if (isPlainObject(value)) {
    Object.values(value).forEach((item) => collectUrls(item, into));
  }
}

async function fetchToLocal(
  url: string,
  result: MigrationResult
): Promise<string | null> {
  const key = s3UrlToKey(url);
  if (!key) {
    result.failures.push({ url, reason: 'Could not derive a storage key' });
    return null;
  }

  if (await mediaExists(key)) {
    result.filesAlreadyPresent += 1;
    return keyToUrl(key);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      result.failures.push({ url, reason: `HTTP ${response.status}` });
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const localUrl = await saveMedia(buffer, key);
    result.filesDownloaded += 1;
    return localUrl;
  } catch (error) {
    result.failures.push({ url, reason: (error as Error).message });
    return null;
  }
}

async function migrateFromS3(options: MigrationOptions): Promise<MigrationResult> {
  const dryRun = Boolean(options.dryRun);
  const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;

  const result: MigrationResult = {
    dryRun,
    collectionsScanned: [],
    documentsUpdated: 0,
    urlsFound: 0,
    filesDownloaded: 0,
    filesAlreadyPresent: 0,
    failures: [],
  };

  const allCollections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.') && !SKIP_COLLECTIONS.has(name));
  const collectionNames = options.collections?.length
    ? allCollections.filter((name) => options.collections!.includes(name))
    : allCollections;

  // Pass 1: find every S3 URL in the database.
  const urls = new Set<string>();
  for (const name of collectionNames) {
    result.collectionsScanned.push(name);
    const cursor = db.collection(name).find({});
    for await (const doc of cursor) {
      collectUrls(doc, urls);
    }
  }
  result.urlsFound = urls.size;
  console.log(`[media] S3 migration: found ${urls.size} S3 URLs in ${collectionNames.length} collections`);

  if (dryRun) {
    return result;
  }

  // Pass 2: download each file once.
  const urlMap = new Map<string, string>();
  let index = 0;
  for (const url of urls) {
    index += 1;
    const localUrl = await fetchToLocal(url, result);
    if (localUrl) urlMap.set(url, localUrl);
    if (index % 25 === 0) {
      console.log(`[media] S3 migration: ${index}/${urls.size} files processed`);
    }
  }

  // Pass 3: rewrite references, one top-level field at a time.
  for (const name of collectionNames) {
    const collection = db.collection(name);
    const cursor = collection.find({});
    for await (const doc of cursor) {
      const $set: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(doc)) {
        if (field === '_id') continue;
        const rewritten = rewriteValue(value, urlMap);
        if (rewritten.changed) $set[field] = rewritten.value;
      }
      if (Object.keys($set).length > 0) {
        await collection.updateOne({ _id: doc._id }, { $set });
        result.documentsUpdated += 1;
      }
    }
  }

  console.log(
    `[media] S3 migration done: ${result.filesDownloaded} downloaded, ${result.filesAlreadyPresent} already present, ${result.documentsUpdated} documents updated, ${result.failures.length} failures`
  );
  return result;
}

Meteor.methods({
  async 'media.migrateFromS3'(options: MigrationOptions = {}) {
    check(options, {
      dryRun: Match.Maybe(Boolean),
      collections: Match.Maybe([String]),
    });
    const user = await Meteor.userAsync();
    if (!user || !(await isAdmin(user._id, getHost(this as any)))) {
      throw new Meteor.Error('not-authorized', 'Admin only');
    }
    return migrateFromS3(options);
  },
});

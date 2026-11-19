import { MongoInternals } from 'meteor/mongo';
import crypto from 'crypto';

import { processImage } from '/imports/api/_utils/services/imageProcessor';
import {
  keyToUrl,
  mediaExists,
  saveMedia,
} from '/imports/api/_utils/services/mediaStorage';

/**
 * Pictures linked straight from Wikimedia (the bootstrap pack and the demo
 * content use them) are copied into our own media storage, and every
 * reference is rewritten to the copy.
 *
 * Why: a picture loaded from upload.wikimedia.org or thumb.wikimedia.org
 * gets a year-long `WMF-Uniq` id cookie and a `GeoIP` cookie set in the
 * visitor's browser before they have done anything. Those are neither
 * necessary nor mentioned in the cookie notice, so they may not be set.
 *
 * Runs in the background after every start, so packs loaded by the
 * bootstrap are covered too; with nothing left to copy it only reads.
 * Each picture is made into the usual WebP sizes under
 * `images/imported/<hash>/`, once per address, shared by every document
 * that used it (deleting an entry never deletes these, as they have no
 * Images record). A picture that cannot be fetched keeps its address and
 * is tried again on the next start.
 */

const URL_PATTERN =
  /https:\/\/(?:[a-z0-9-]+\.)*(?:wikimedia|wikipedia)\.org\/[^\s"'<>()\\]+/gi;
const QUICK_TEST = /(?:wikimedia|wikipedia)\.org/i;

const SKIP_COLLECTIONS = new Set(['meteor_accounts_loginServiceConfiguration']);

// Wikimedia's policy asks for an identifying User-Agent
const USER_AGENT = `cocoso (${process.env.ROOT_URL || 'cocoso'})`;

const log = (...args: unknown[]) => console.info('[local-images]', ...args);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function collectUrls(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    if (QUICK_TEST.test(value)) {
      (value.match(URL_PATTERN) || []).forEach((url) => into.add(url));
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, into));
  } else if (isPlainObject(value)) {
    Object.values(value).forEach((item) => collectUrls(item, into));
  }
}

function rewrite(value: unknown, urlMap: Map<string, string>): unknown {
  if (typeof value === 'string') {
    return QUICK_TEST.test(value)
      ? value.replace(URL_PATTERN, (url) => urlMap.get(url) || url)
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewrite(item, urlMap));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rewrite(v, urlMap)])
    );
  }
  return value;
}

// The copy's full-size address, or null when the picture can't be fetched
async function copyPicture(url: string): Promise<string | null> {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
  const folder = `images/imported/${hash}`;
  if (await mediaExists(`${folder}/full.webp`)) {
    return keyToUrl(`${folder}/full.webp`);
  }
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const { variants } = await processImage(buffer, 'entry');
    // full last, so its presence means the whole set is there
    const ordered = [...variants].sort(
      (a, b) => Number(a.suffix === 'full') - Number(b.suffix === 'full')
    );
    for (const variant of ordered) {
      await saveMedia(variant.buffer, `${folder}/${variant.suffix}.webp`);
    }
    return keyToUrl(`${folder}/full.webp`);
  } catch (error) {
    log(`could not copy ${url}:`, (error as Error).message);
    return null;
  }
}

export async function localizeExternalImages() {
  const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
  const collections = (await db.listCollections().toArray())
    .map((c: { name: string }) => c.name)
    .filter((name: string) => !name.startsWith('system.'))
    .filter((name: string) => !SKIP_COLLECTIONS.has(name));

  const urlMap = new Map<string, string>();
  let documents = 0;

  for (const name of collections) {
    const collection = db.collection(name);
    for await (const doc of collection.find({})) {
      const urls = new Set<string>();
      collectUrls(doc, urls);
      if (!urls.size) {
        continue;
      }
      for (const url of urls) {
        if (!urlMap.has(url)) {
          const copy = await copyPicture(url);
          if (copy) {
            urlMap.set(url, copy);
          }
        }
      }
      const { _id, ...fields } = doc;
      const next = rewrite(fields, urlMap) as Record<string, unknown>;
      const changed = Object.fromEntries(
        Object.entries(next).filter(
          ([k, v]) => JSON.stringify(v) !== JSON.stringify(fields[k])
        )
      );
      if (Object.keys(changed).length) {
        await collection.updateOne({ _id }, { $set: changed });
        documents += 1;
      }
    }
  }

  if (urlMap.size || documents) {
    log(`copied ${urlMap.size} pictures, updated ${documents} documents`);
  }
}

import { Meteor } from 'meteor/meteor';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

/**
 * Local media storage.
 *
 * Files are written to a directory on the same server that runs the app and
 * served back by the HTTP handler in imports/startup/server/media.ts under
 * the `/media` route. Every stored file has a unique key, so URLs are stable
 * and can be cached forever.
 *
 * Configuration (all optional), in settings.json:
 *
 *   "media": {
 *     "storagePath": "/var/lib/cocoso/media",
 *     "publicUrl": "https://example.org/media"
 *   }
 *
 * `storagePath` falls back to the MEDIA_STORAGE_PATH env var, then to a
 * `media` folder next to the project (dev) or the working directory (prod).
 * `publicUrl` falls back to ROOT_URL + `/media`.
 */

interface MediaSettings {
  storagePath?: string;
  publicUrl?: string;
}

const settings = ((Meteor.settings as { media?: MediaSettings }).media ||
  {}) as MediaSettings;

export const MEDIA_ROUTE = '/media';

const storageRoot = path.resolve(
  settings.storagePath ||
    process.env.MEDIA_STORAGE_PATH ||
    path.join(process.env.PWD || process.cwd(), 'media')
);

const publicUrl = (
  settings.publicUrl || Meteor.absoluteUrl(MEDIA_ROUTE.slice(1))
).replace(/\/+$/, '');

export function getMediaStorageRoot(): string {
  return storageRoot;
}

export function getMediaPublicUrl(): string {
  return publicUrl;
}

/**
 * Make a single path segment safe to use on disk and in a URL.
 * Keeps letters, digits, dot, dash and underscore; everything else becomes `_`.
 */
export function sanitizeSegment(segment: string): string {
  const cleaned = segment
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^\.+/, '');
  return cleaned || '_';
}

/**
 * Turn a storage key (e.g. `images/user/abc/full.webp`) into an absolute
 * path inside the storage root. Returns null if the key would escape the root.
 */
export function resolveMediaPath(key: string): string | null {
  const segments = key.split('/').filter(Boolean);
  if (segments.some((s) => s === '.' || s === '..')) {
    return null;
  }
  const absolute = path.resolve(storageRoot, ...segments);
  if (absolute !== storageRoot && !absolute.startsWith(storageRoot + path.sep)) {
    return null;
  }
  return absolute;
}

export function keyToUrl(key: string): string {
  const encoded = key
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `${publicUrl}/${encoded}`;
}

/**
 * Extract the storage key from a URL served by this server.
 * Returns null for URLs that do not belong to local media storage
 * (e.g. legacy S3 links that were never migrated).
 */
export function urlToKey(url: string): string | null {
  if (!url) return null;
  let pathname: string;
  try {
    pathname = new URL(url, publicUrl).pathname;
  } catch {
    return null;
  }
  const routePath = new URL(publicUrl).pathname.replace(/\/+$/, '');
  const sameOrigin =
    url.startsWith(publicUrl + '/') || url.startsWith(routePath + '/');
  if (!sameOrigin) return null;
  const rest = pathname.slice(routePath.length).replace(/^\/+/, '');
  try {
    return rest
      .split('/')
      .map((s) => decodeURIComponent(s))
      .join('/');
  } catch {
    return null;
  }
}

/**
 * Write a buffer to local storage under `key` and return its public URL.
 */
export async function saveMedia(buffer: Buffer, key: string): Promise<string> {
  const filePath = resolveMediaPath(key);
  if (!filePath) {
    throw new Meteor.Error('invalid-media-key', `Refusing to store: ${key}`);
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, buffer);
  return keyToUrl(key);
}

export async function mediaExists(key: string): Promise<boolean> {
  const filePath = resolveMediaPath(key);
  if (!filePath) return false;
  try {
    const stat = await fsp.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Delete one stored file by its public URL. Non-local URLs are ignored.
 * Empty parent folders are removed as well.
 */
export async function deleteMedia(url: string): Promise<void> {
  const key = urlToKey(url);
  if (!key) {
    console.warn('[media] Not a local media URL, skipping delete:', url);
    return;
  }
  const filePath = resolveMediaPath(key);
  if (!filePath) return;

  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  // Remove now-empty folders up to (not including) the storage root.
  let dir = path.dirname(filePath);
  while (dir !== storageRoot && dir.startsWith(storageRoot + path.sep)) {
    try {
      await fsp.rmdir(dir);
    } catch {
      break;
    }
    dir = path.dirname(dir);
  }
}

export async function deleteMultipleMedia(urls: string[]): Promise<void> {
  for (const url of urls) {
    await deleteMedia(url);
  }
}

// --- Serving -------------------------------------------------------------

const INLINE_TYPES: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

const ATTACHMENT_TYPES: Record<string, string> = {
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  json: 'application/json',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  rtf: 'application/rtf',
  epub: 'application/epub+zip',
};

/**
 * Decide how a stored file is served. Anything that a browser could execute
 * as a page on our origin (html, svg, xml, js, ...) is deliberately not in the
 * inline list and is sent as a generic download.
 */
export function describeFile(fileName: string): {
  contentType: string;
  disposition: 'inline' | 'attachment';
} {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  if (INLINE_TYPES[ext]) {
    return { contentType: INLINE_TYPES[ext], disposition: 'inline' };
  }
  return {
    contentType: ATTACHMENT_TYPES[ext] || 'application/octet-stream',
    disposition: 'attachment',
  };
}

export function createReadStream(filePath: string): fs.ReadStream {
  return fs.createReadStream(filePath);
}

export async function statMedia(filePath: string): Promise<fs.Stats | null> {
  try {
    const stat = await fsp.stat(filePath);
    return stat.isFile() ? stat : null;
  } catch {
    return null;
  }
}

Meteor.startup(async () => {
  await fsp.mkdir(storageRoot, { recursive: true });
  console.log(`[media] Storing uploads in ${storageRoot}`);
  console.log(`[media] Serving uploads from ${publicUrl}`);
});

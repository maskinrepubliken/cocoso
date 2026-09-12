import { createLogoPngBuffer } from './imageProcessor';
import { saveMedia } from './mediaStorage';

/**
 * Generates the PNG logo variant from a freshly-uploaded file buffer and
 * stores it alongside the WebP variants (same folder, so it shares their
 * lifecycle/cleanup).
 */
export async function uploadLogoPng(
  fileBuffer: Buffer,
  folderKey: string
): Promise<string> {
  const pngBuffer = await createLogoPngBuffer(fileBuffer);
  return saveMedia(pngBuffer, `${folderKey}/full.png`);
}

/**
 * Backfills the PNG variant for a logo that was already uploaded (WebP-only)
 * before this feature existed — fetches the existing image's bytes, then
 * runs the same conversion + upload as a fresh upload would.
 */
export async function backfillLogoPngFromUrl(
  logoUrl: string,
  folderKey: string
): Promise<string> {
  const response = await fetch(logoUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch existing logo at ${logoUrl}: ${response.status}`
    );
  }
  const fileBuffer = Buffer.from(await response.arrayBuffer());
  return uploadLogoPng(fileBuffer, folderKey);
}

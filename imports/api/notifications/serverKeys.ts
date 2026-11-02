import crypto from 'crypto';
import { Mongo } from 'meteor/mongo';

/**
 * Keys the server makes for itself the first time it needs them and keeps
 * in the database, so there is nothing to configure and every restart uses
 * the same ones. Server only; never published.
 *
 * - `webPush`: the VAPID key pair push services know this site by. A new
 *   pair would orphan every browser's push subscription.
 * - `links`: the secret that signs unsubscribe links in emails.
 */
const ServerKeys = new Mongo.Collection<{
  _id: string;
  createdAt: Date;
  [key: string]: unknown;
}>('serverKeys');

export interface WebPushKeys {
  // Uncompressed P-256 point, base64url: what browsers subscribe with
  publicKey: string;
  privateJwk: crypto.JsonWebKey;
}

const b64url = (buffer: Buffer): string => buffer.toString('base64url');

async function getOrCreate<T>(id: string, make: () => T): Promise<T> {
  const existing = await ServerKeys.findOneAsync(id);
  if (existing) {
    return existing.value as T;
  }
  const value = make();
  try {
    await ServerKeys.insertAsync({ _id: id, value, createdAt: new Date() });
    return value;
  } catch {
    // Made at the same moment by another call: theirs wins
    const raced = await ServerKeys.findOneAsync(id);
    return raced?.value as T;
  }
}

let webPush: Promise<WebPushKeys> | undefined;
export function getWebPushKeys(): Promise<WebPushKeys> {
  webPush ||= getOrCreate('webPush', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = publicKey.export({ format: 'jwk' });
    const point = Buffer.concat([
      Buffer.from([4]),
      Buffer.from(jwk.x as string, 'base64url'),
      Buffer.from(jwk.y as string, 'base64url'),
    ]);
    return {
      publicKey: b64url(point),
      privateJwk: privateKey.export({ format: 'jwk' }),
    };
  });
  return webPush;
}

let links: Promise<string> | undefined;
export function getLinkSecret(): Promise<string> {
  links ||= getOrCreate('links', () => b64url(crypto.randomBytes(32)));
  return links;
}

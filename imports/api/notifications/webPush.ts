import crypto from 'crypto';

import { getSmtpSettings } from '../_utils/services/mails/smtp';
import { extractEmailAddress } from '../_utils/services/mails/mail.helpers';
import { getSite } from '../site/site';
import { getWebPushKeys } from './serverKeys';

/**
 * Sends one Web Push message with Node's own crypto, no library: the
 * payload is encrypted for the browser (RFC 8291, aes128gcm) and the request
 * is signed with the site's VAPID key (RFC 8292). Server only.
 */

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body?: string;
  // Opened when the notification is clicked; a path on the site
  url?: string;
  // Notifications with the same tag replace each other
  tag?: string;
}

// `gone`: the browser has dropped the subscription; forget it
export type PushResult = { ok: boolean; gone: boolean; status?: number };

const hkdf = (ikm: Buffer, salt: Buffer, info: Buffer, length: number) =>
  Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, length));

export function encryptPayload(target: PushTarget, payload: Buffer): Buffer {
  const uaPublic = Buffer.from(target.keys.p256dh, 'base64url');
  const authSecret = Buffer.from(target.keys.auth, 'base64url');

  const ecdh = crypto.createECDH('prime256v1');
  const asPublic = ecdh.generateKeys();
  const sharedSecret = ecdh.computeSecret(uaPublic);

  const ikm = hkdf(
    sharedSecret,
    authSecret,
    Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]),
    32
  );
  const salt = crypto.randomBytes(16);
  const cek = hkdf(ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([
    // One record: the payload and the last-record delimiter, no padding
    cipher.update(Buffer.concat([payload, Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096);
  return Buffer.concat([
    salt,
    recordSize,
    Buffer.from([asPublic.length]),
    asPublic,
    encrypted,
  ]);
}

async function vapidHeader(endpoint: string): Promise<string> {
  const { publicKey, privateJwk } = await getWebPushKeys();
  const site = await getSite();
  const contact =
    extractEmailAddress(getSmtpSettings()?.fromEmail || '') ||
    site?.settings?.email ||
    'noreply@example.com';
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ typ: 'JWT', alg: 'ES256' })}.${encode({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: `mailto:${contact}`,
  })}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), {
    key: crypto.createPrivateKey({ key: privateJwk, format: 'jwk' }),
    dsaEncoding: 'ieee-p1363',
  });
  return `vapid t=${unsigned}.${signature.toString(
    'base64url'
  )}, k=${publicKey}`;
}

export async function sendWebPush(
  target: PushTarget,
  payload: PushPayload
): Promise<PushResult> {
  try {
    const body = encryptPayload(target, Buffer.from(JSON.stringify(payload)));
    const response = await fetch(target.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidHeader(target.endpoint),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        // Kept by the push service for a day while the device is offline
        TTL: String(24 * 60 * 60),
        Urgency: 'normal',
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(10000),
    });
    return {
      ok: response.ok,
      gone: response.status === 404 || response.status === 410,
      status: response.status,
    };
  } catch (error) {
    console.warn('[push] could not send:', (error as Error)?.message);
    return { ok: false, gone: false };
  }
}

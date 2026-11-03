import webpush, { WebPushError } from 'web-push';

import { getSmtpSettings } from '../_utils/services/mails/smtp';
import { extractEmailAddress } from '../_utils/services/mails/mail.helpers';
import { getSite } from '../site/site';
import { getWebPushKeys } from './serverKeys';

/**
 * Sends one Web Push message with the `web-push` package: it encrypts the
 * payload for the browser (RFC 8291) and signs the request with the site's
 * VAPID key (RFC 8292) from serverKeys.ts. Server only.
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

async function vapidDetails() {
  const { publicKey, privateJwk } = await getWebPushKeys();
  const site = await getSite();
  const contact =
    extractEmailAddress(getSmtpSettings()?.fromEmail || '') ||
    site?.settings?.email ||
    'noreply@example.com';
  return {
    subject: `mailto:${contact}`,
    publicKey,
    // The private scalar of the stored key, base64url as web-push wants it
    privateKey: privateJwk.d as string,
  };
}

export async function sendWebPush(
  target: PushTarget,
  payload: PushPayload
): Promise<PushResult> {
  try {
    const response = await webpush.sendNotification(
      target,
      JSON.stringify(payload),
      {
        vapidDetails: await vapidDetails(),
        // Kept by the push service for a day while the device is offline
        TTL: 24 * 60 * 60,
        urgency: 'normal',
        timeout: 10000,
      }
    );
    return { ok: true, gone: false, status: response.statusCode };
  } catch (error) {
    if (error instanceof WebPushError) {
      return {
        ok: false,
        gone: error.statusCode === 404 || error.statusCode === 410,
        status: error.statusCode,
      };
    }
    console.warn('[push] could not send:', (error as Error)?.message);
    return { ok: false, gone: false };
  }
}

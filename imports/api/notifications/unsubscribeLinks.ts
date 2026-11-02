import crypto from 'crypto';

import { publicUrl } from '../_utils/shared';
import { getLinkSecret } from './serverKeys';

/**
 * Signed links that let someone stop a kind of email without logging in:
 * the newsletter, or updates about one event. The token carries the address
 * and what to stop, and an HMAC so nobody can make one for someone else.
 * Server only.
 */

export type UnsubscribeTarget =
  | { kind: 'newsletter'; email: string }
  | { kind: 'activity'; email: string; activityId: string };

const sign = (data: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('base64url');

export async function unsubscribeToken(
  target: UnsubscribeTarget
): Promise<string> {
  const data = Buffer.from(
    JSON.stringify({ ...target, email: target.email.trim().toLowerCase() })
  ).toString('base64url');
  return `${data}.${sign(data, await getLinkSecret())}`;
}

export async function readUnsubscribeToken(
  token: string
): Promise<UnsubscribeTarget | null> {
  const [data, signature] = String(token || '').split('.');
  if (!data || !signature) {
    return null;
  }
  const expected = Buffer.from(sign(data, await getLinkSecret()));
  const given = Buffer.from(signature);
  if (
    expected.length !== given.length ||
    !crypto.timingSafeEqual(expected, given)
  ) {
    return null;
  }
  try {
    const target = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (target?.kind === 'newsletter' && target.email) {
      return { kind: 'newsletter', email: String(target.email) };
    }
    if (target?.kind === 'activity' && target.email && target.activityId) {
      return {
        kind: 'activity',
        email: String(target.email),
        activityId: String(target.activityId),
      };
    }
  } catch {
    // Not ours
  }
  return null;
}

// The page that asks for a click to confirm (link scanners only fetch it)
export async function unsubscribeUrl(target: UnsubscribeTarget) {
  return publicUrl(`/unsubscribe/${await unsubscribeToken(target)}`);
}

// RFC 8058 one-click: mail clients POST here straight from their own button
export async function listUnsubscribeHeaders(target: UnsubscribeTarget) {
  const token = await unsubscribeToken(target);
  return {
    'List-Unsubscribe': `<${publicUrl(`/unsubscribe-now/${token}`)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

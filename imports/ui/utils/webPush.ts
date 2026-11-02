import { call } from '/imports/api/_utils/shared';

/**
 * Push notifications in this browser: the service worker (public/sw.js),
 * the browser's permission and the subscription the server sends to
 * (imports/api/notifications). Browser only.
 */

export type PushState =
  // No push here at all, or (iPhone/iPad) not until added to the home screen
  | 'unsupported'
  | 'needs-install'
  // The person said no in the browser; only the browser's settings undo it
  | 'denied'
  | 'off'
  | 'on';

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) || null;
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  if (Notification.permission !== 'granted') {
    return 'off';
  }
  return (await currentSubscription()) ? 'on' : 'off';
}

const toBytes = (base64url: string) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

// Asks for permission (must follow a click) and tells the server
export async function turnPushOn(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return permission === 'denied' ? 'denied' : 'off';
  }
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const publicKey = (await call('getPushPublicKey')) as string;
  let subscription = await reg.pushManager.getSubscription();
  // Made with another key (e.g. a reinstalled server): start over
  const key = subscription?.options?.applicationServerKey;
  if (
    subscription &&
    key &&
    btoa(String.fromCharCode(...new Uint8Array(key)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '') !== publicKey
  ) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ||= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toBytes(publicKey),
  });
  await call(
    'savePushSubscription',
    subscription.toJSON(),
    navigator.userAgent
  );
  return 'on';
}

export async function turnPushOff(): Promise<PushState> {
  const subscription = await currentSubscription();
  if (subscription) {
    await call('removePushSubscription', subscription.endpoint);
    await subscription.unsubscribe();
  }
  return 'off';
}

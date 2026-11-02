// The site's service worker: only shows push notifications and opens the
// right page when one is clicked. It caches nothing, so it never serves an
// old version of the site. Registered by imports/ui/utils/webPush.ts.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim())
);

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { title: event.data ? event.data.text() : '' };
  }
  const title = data.title || self.location.hostname;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/android-chrome-192x192.png',
      badge: '/icons/favicon-32x32.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || '/',
    self.location.origin
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find((client) => client.url === url);
        if (open) {
          return open.focus();
        }
        return self.clients.openWindow(url);
      })
  );
});

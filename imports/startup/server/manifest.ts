import { WebApp } from 'meteor/webapp';
import type { IncomingMessage, ServerResponse } from 'http';

import { getSite } from '/imports/api/site/site';

/**
 * The web app manifest, so the site can be added to a phone's home screen
 * as an app — which is what iPhones and iPads require before a site may
 * send push notifications.
 */
WebApp.connectHandlers.use(
  '/manifest.webmanifest',
  async (_req: IncomingMessage, res: ServerResponse) => {
    const site = (await getSite()) as any;
    const name = site?.settings?.name || 'Cocoso';
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(
      JSON.stringify({
        name,
        short_name: site?.settings?.shortName || name,
        lang: site?.settings?.lang || 'sv',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#eeeedb',
        icons: [
          {
            src: '/icons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      })
    );
  }
);

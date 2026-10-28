import { WebApp } from 'meteor/webapp';
import type { IncomingMessage, ServerResponse } from 'http';

import { SHARE_IMAGE_ROUTE } from '/imports/api/share/shareImage';
import {
  getShareImage,
  isShareImageKind,
} from '/imports/api/share/shareImage.server';

/**
 * Serves the generated share images under /share-image/<kind>/<id>.jpg
 * (imports/api/share). The `?v=` fingerprint in the pages' links changes
 * whenever the picture does, so a day's caching is safe.
 */
WebApp.connectHandlers.use(
  SHARE_IMAGE_ROUTE,
  async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.end();
      return;
    }

    const pathname = (req.url || '/').split('?')[0];
    const match = pathname.match(/^\/([a-z]+)\/([A-Za-z0-9]+)\.jpg$/);
    if (!match || !isShareImageKind(match[1])) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    try {
      const image = await getShareImage(match[1], match[2]);
      if (!image) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', image.buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('ETag', `"${image.fingerprint}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(req.method === 'HEAD' ? undefined : image.buffer);
    } catch (error) {
      console.error('[share-image]', pathname, error);
      res.statusCode = 500;
      res.end('Could not draw the image');
    }
  }
);

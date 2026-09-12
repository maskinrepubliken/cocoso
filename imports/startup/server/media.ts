import { WebApp } from 'meteor/webapp';
import type { IncomingMessage, ServerResponse } from 'http';

import {
  MEDIA_ROUTE,
  describeFile,
  createReadStream,
  resolveMediaPath,
  statMedia,
} from '/imports/api/_utils/services/mediaStorage';

/**
 * Serves uploaded images and documents from local disk under /media/*.
 * Keys are unique per upload, so responses are cached as immutable.
 */
WebApp.connectHandlers.use(
  MEDIA_ROUTE,
  async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.end();
      return;
    }

    let key: string;
    try {
      const pathname = (req.url || '/').split('?')[0];
      key = pathname
        .split('/')
        .map((s) => decodeURIComponent(s))
        .join('/');
    } catch {
      res.statusCode = 400;
      res.end('Bad request');
      return;
    }

    const filePath = resolveMediaPath(key);
    const stat = filePath ? await statMedia(filePath) : null;
    if (!filePath || !stat) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const { contentType, disposition } = describeFile(filePath);
    const fileName = filePath.split('/').pop() || 'file';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'none');
    if (disposition === 'attachment') {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
    }

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
    stream.pipe(res);
  }
);

import { WebApp } from 'meteor/webapp';
import type { IncomingMessage, ServerResponse } from 'http';

import { readUnsubscribeToken } from '/imports/api/notifications/unsubscribeLinks';
import { applyUnsubscribe } from '/imports/api/notifications/notification.methods';

/**
 * RFC 8058 one-click unsubscribe: mail clients (Gmail, Apple Mail) POST to
 * the List-Unsubscribe address of a newsletter or event update when the
 * reader presses their own "Unsubscribe" button. Only POST stops anything;
 * people following the link in the email get /unsubscribe/<token>, which
 * asks for a click so link scanners can't unsubscribe anyone.
 */
WebApp.connectHandlers.use(
  '/unsubscribe-now',
  async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      res.end();
      return;
    }
    const token = decodeURIComponent(
      (req.url || '/').split('?')[0].replace(/^\//, '')
    );
    const target = await readUnsubscribeToken(token);
    if (!target) {
      res.statusCode = 400;
      res.end('Invalid link');
      return;
    }
    try {
      await applyUnsubscribe(target);
      res.statusCode = 200;
      res.end('Unsubscribed');
    } catch (error) {
      console.error('[unsubscribe] failed', error);
      res.statusCode = 500;
      res.end();
    }
  }
);

import { WebApp } from 'meteor/webapp';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * The font files in public/fonts may be used from anywhere: the emails'
 * @font-face rules point at them, and a mail read in a web client loads
 * them from another origin, which browsers only allow with this header.
 * Before Meteor's static files, so it lands on their responses.
 */
WebApp.rawConnectHandlers.use(
  '/fonts',
  (_req: IncomingMessage, res: ServerResponse, next: () => void) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  }
);

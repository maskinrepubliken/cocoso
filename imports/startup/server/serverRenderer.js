import { Meteor } from 'meteor/meteor';
import React from 'react';
import { Helmet } from 'react-helmet';
import { renderToString } from 'react-dom/server';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router';

import { getSite, sitePublicFields } from '/imports/api/site/site';
import appRoutes from '/imports/appRoutes';
import { getGlobalStyles } from '/imports/ui/utils/globalStylesManager';
import i18n, { setDayjsLocale } from '/imports/startup/i18n';
import { resolveLangFromRequest } from '/imports/api/_utils/i18n/serverI18n';

let stitchesConfig = null;

export default async function serverRenderer(sink) {
  const host = sink?.request?.headers?.['host'];

  const siteDoc = await getSite(sitePublicFields);
  const pages = await Meteor.callAsync('getPageTitles');
  const locations = await Meteor.callAsync('getLocations');

  if (!stitchesConfig) {
    stitchesConfig = await import('/stitches.config');
  }
  const globalCssString = siteDoc ? getGlobalStyles(siteDoc.theme) : '';
  const { getCssText } = stitchesConfig;

  const pageTitles = pages.map((p) => p.title);

  // sink.request here isn't the raw Node req — it's WebApp.categorizeRequest(req)
  // (meteor/webapp's webapp_server.js), which reshapes it to
  // { path, url: { query: {...} }, headers, cookies, ... }. The pathname
  // lives in `path`; `url.query` is the parsed query as a plain object,
  // not a search string, so it's rebuilt here for the fullUrl below.
  const pathname = sink?.request?.path || '';
  const queryString = new URLSearchParams(
    sink?.request?.url?.query || {}
  ).toString();
  const search = queryString ? `?${queryString}` : '';

  // Resolve the visitor's actual language (querystring -> i18next cookie ->
  // Accept-Language -> default), mirroring the client LanguageDetector's own
  // priority order, and render with a per-request clone rather than
  // mutating the shared i18n singleton — that would race under concurrent
  // requests in different languages. The clone shares already-loaded
  // resource data (see the Meteor.startup block in imports/startup/i18n.js
  // that preloads common+accounts for all languages), so this is cheap and
  // synchronous, not a fresh fetch.
  const lngParam = new URLSearchParams(search || '').get('lng');
  const resolvedLang = resolveLangFromRequest(
    sink.request,
    lngParam,
    siteDoc?.settings?.lang
  );
  const requestI18n = i18n.cloneInstance({ lng: resolvedLang });

  const props = {
    siteDoc,
    pageTitles,
    locations,
    i18nInstance: requestI18n,
  };

  const routes = appRoutes(props);
  const { query, dataRoutes } = createStaticHandler(routes);

  const protocol = sink?.request?.connection?.encrypted ? 'https' : 'http';
  const fullUrl = `${protocol}://${host}${pathname}${search || ''}`;
  const fetchRequest = new Request(fullUrl);

  const context = await query(fetchRequest);

  if (context instanceof Response) {
    if (context.status >= 300 && context.status < 400) {
      const location = context.headers.get('Location');
      sink.redirect(location);
      return;
    }
    throw context;
  }

  const router = createStaticRouter(dataRoutes, context);

  // dayjs has one global locale; renderToString is synchronous, so setting
  // it right before rendering holds for this request.
  setDayjsLocale(resolvedLang);
  const appHtml = renderToString(
    <StaticRouterProvider router={router} context={context} />
  );

  const helmet = Helmet.renderStatic();

  sink.appendToHead(`
    ${helmet.title.toString()}
    ${helmet.meta.toString()}
    ${helmet.link.toString()}
    <style id="global-theme">${globalCssString}</style>
    <style id="stitches">${getCssText()}</style>
  `);

  sink.renderIntoElementById('root', appHtml);
}

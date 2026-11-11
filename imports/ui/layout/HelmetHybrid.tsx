import { Meteor } from 'meteor/meteor';
import React from 'react';
import { Helmet } from 'react-helmet';
import { useAtomValue } from 'jotai';

import { allLangs } from '/imports/startup/i18n';
import { seasonAtom } from '/imports/state';
import { SEASON_FLOOR } from '/imports/api/_utils/season';

import ShareMeta from './ShareMeta';

const publicSettings = Meteor?.settings?.public;

// CSS generic families (the default theme uses 'sans-serif') are not Google
// Fonts, so requesting them only produces a failing stylesheet request.
const GENERIC_FONT_FAMILIES = [
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
];

// og:locale wants a territory as well as a language
const LOCALES: Record<string, string> = { sv: 'sv_SE', en: 'en_GB' };

export interface HelmetHybridProps {
  siteDoc: any;
  /** The current path, for the defaults' canonical and og:url. */
  pathname: string;
  /** What a link shows when the page says nothing of its own. */
  description?: string;
}

export default function HelmetHybrid({
  siteDoc,
  pathname,
  description,
}: HelmetHybridProps) {
  const season = useAtomValue(seasonAtom);
  if (!siteDoc) {
    return null;
  }
  const lang = siteDoc.settings?.lang;
  const siteName = siteDoc.settings?.name || '';
  const fontFamily = siteDoc?.theme?.body?.fontFamily;
  const fontHref =
    fontFamily && !GENERIC_FONT_FAMILIES.includes(fontFamily)
      ? `https://fonts.googleapis.com/css2?family=${fontFamily}:ital,wght@0,300;0,400;0,700;1,400&display=swap`
      : null;

  // The icons: a CDN when settings name one, else the ones in public/icons.
  const iconsBase = publicSettings?.iconsBaseUrl || '/icons';

  return (
    <>
      {/* The defaults for a page that does not describe itself; the pages'
          own ShareMeta replaces them. */}
      <ShareMeta description={description} path={pathname} />
      <Helmet
        htmlAttributes={{ lang }}
        defaultTitle={siteName}
        titleTemplate={siteName ? `%s | ${siteName}` : '%s'}
      >
        {siteName && <meta property="og:site_name" content={siteName} />}
        {siteName && <meta property="og:title" content={siteName} />}
        {siteName && <meta name="twitter:title" content={siteName} />}
        {lang && <meta property="og:locale" content={LOCALES[lang] || lang} />}
        {allLangs
          .filter((other) => other.value !== lang)
          .map((other) => (
            <meta
              key={other.value}
              property="og:locale:alternate"
              content={LOCALES[other.value] || other.value}
            />
          ))}
        {/* Facebook's Sharing Debugger asks for an app; optional */}
        {publicSettings?.facebookAppId && (
          <meta property="fb:app_id" content={publicSettings.facebookAppId} />
        )}
        {/* The browser's bar and the strip around a notch take the
            season's floor, as the page does */}
        <meta name="theme-color" content={SEASON_FLOOR[season]} />
        {/* Installable as an app: iPhones only allow push from one */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* The name under the icon on the home screen, short like the manifest's */}
        {siteName && (
          <meta
            name="apple-mobile-web-app-title"
            content={siteDoc.settings?.shortName || siteName}
          />
        )}
        <link
          rel="icon"
          type="image/svg+xml"
          href={`${iconsBase}/favicon.svg`}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin />
        {fontHref && <link href={fontHref} rel="stylesheet" />}

        <link
          rel="android-chrome-192x192"
          sizes="192x192"
          href={`${iconsBase}/android-chrome-192x192.png`}
        />
        <link
          rel="android-chrome-512x512"
          sizes="512x512"
          href={`${iconsBase}/android-chrome-512x512.png`}
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={`${iconsBase}/apple-touch-icon.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={`${iconsBase}/favicon-32x32.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={`${iconsBase}/favicon-16x16.png`}
        />
      </Helmet>
    </>
  );
}

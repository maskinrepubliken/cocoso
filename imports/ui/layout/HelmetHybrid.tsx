import { Meteor } from 'meteor/meteor';
import React from 'react';
import { Helmet } from 'react-helmet';
import { publicUrl } from '/imports/api/_utils/shared';

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

export interface HelmetHybridProps {
  siteDoc: any;
}

export default function HelmetHybrid({ siteDoc }: HelmetHybridProps) {
  if (!siteDoc) {
    return null;
  }
  const lang = siteDoc.settings?.lang;
  const fontFamily = siteDoc?.theme?.body?.fontFamily;
  const fontHref =
    fontFamily && !GENERIC_FONT_FAMILIES.includes(fontFamily)
      ? `https://fonts.googleapis.com/css2?family=${fontFamily}:ital,wght@0,300;0,400;0,700;1,400&display=swap`
      : null;

  // The icons: a CDN when settings name one, else the ones in public/icons.
  const iconsBase = publicSettings?.iconsBaseUrl || '/icons';

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{siteDoc.settings?.name}</title>
      <link rel="canonical" href={publicUrl()} />
      <meta name="theme-color" content="#eeeedb" />
      <link rel="icon" type="image/svg+xml" href={`${iconsBase}/favicon.svg`} />

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
  );
}

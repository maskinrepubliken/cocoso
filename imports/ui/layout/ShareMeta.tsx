import React from 'react';
import { Helmet } from 'react-helmet';

import { publicUrl } from '/imports/api/_utils/shared';
import {
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_WIDTH,
} from '/imports/api/share/shareImage';
import { getImageUrlBest, type ImageRef } from '/imports/ui/utils/imageHelper';

// Everything a page says about itself to browsers, search engines and
// link previews (Facebook, Messenger, WhatsApp, iMessage, Slack, LinkedIn,
// X, …), in one place. Every page that has something of its own to show
// renders one of these; the layout renders one with the site's defaults
// and adds what is the same everywhere (og:site_name, og:locale, the
// " | <site name>" title suffix) in HelmetHybrid. react-helmet lets the
// page's own tags win over the layout's.
//
// For events and places the picture is the generated share image
// (imports/api/share), which carries the title, place and date.

export const DEFAULT_SHARE_IMAGE = '/images/og-default.jpg';

// Plain text from what may be HTML, shortened on a word boundary.
export function shareText(text?: string | null, max = 200): string {
  const plain = String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) {
    return plain;
  }
  return `${plain.slice(0, max - 1).replace(/[\s,.;:–-]+\S*$/, '')}…`;
}

export interface ShareMetaProps {
  /** The page's own name; the layout adds the site's name to the tab title. */
  title?: string | null;
  description?: string | null;
  /** The page's path on this site, e.g. `/activities/abc`, or its full URL. */
  path: string;
  /**
   * What a shared link shows: a generated share image URL, an uploaded
   * image (any form the entries store) or nothing for the site's picture.
   */
  image?: ImageRef;
  /** Set when the image is a generated share image of the known size. */
  generatedImage?: boolean;
  imageAlt?: string;
  type?: 'website' | 'article' | 'profile';
  /** Keep the page out of search engines (drafts, private things). */
  noIndex?: boolean;
}

export default function ShareMeta({
  title,
  description,
  path,
  image,
  generatedImage = false,
  imageAlt,
  type = 'website',
  noIndex = false,
}: ShareMetaProps) {
  const pageTitle = shareText(title, 90);
  const text = shareText(description);
  const url = /^https?:\/\//.test(path) ? path : publicUrl(path);
  const pictureUrl =
    generatedImage && typeof image === 'string'
      ? image
      : getImageUrlBest(image);
  const imageUrl = pictureUrl || publicUrl(DEFAULT_SHARE_IMAGE);
  // The generated pictures and the site's own are 1200×630; an uploaded
  // photo can be any size, so none is claimed for it.
  const knownSize = generatedImage || !pictureUrl;

  return (
    <Helmet>
      {pageTitle && <title>{pageTitle}</title>}
      <link rel="canonical" href={url} />
      <meta name="description" content={text} />
      {noIndex && <meta name="robots" content="noindex" />}

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      {pageTitle && <meta property="og:title" content={pageTitle} />}
      <meta property="og:description" content={text} />
      <meta property="og:image" content={imageUrl} />
      {knownSize && (
        <meta property="og:image:width" content={String(SHARE_IMAGE_WIDTH)} />
      )}
      {knownSize && (
        <meta property="og:image:height" content={String(SHARE_IMAGE_HEIGHT)} />
      )}
      {(imageAlt || pageTitle) && (
        <meta property="og:image:alt" content={imageAlt || pageTitle} />
      )}

      <meta name="twitter:card" content="summary_large_image" />
      {pageTitle && <meta name="twitter:title" content={pageTitle} />}
      <meta name="twitter:description" content={text} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}

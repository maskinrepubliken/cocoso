import { Meteor } from 'meteor/meteor';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import dayjs from 'dayjs';
import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

import Activities from '/imports/api/activities/activity';
import { getWeeklyPattern } from '/imports/api/activities/recurrence';
import Images from '/imports/api/images/image.collection';
import Locations from '/imports/api/locations/location';
import Resources from '/imports/api/resources/resource';
import { formatAddress } from '/imports/api/_utils/address';
import { kindsOf } from '/imports/api/_utils/kinds';
import { getSite } from '/imports/api/site/site';
import {
  getMediaStorageRoot,
  mediaExists,
  resolveMediaPath,
  saveMedia,
  urlToKey,
} from '/imports/api/_utils/services/mediaStorage';
import { translate } from '/imports/api/_utils/i18n/serverI18n';
import { setDayjsLocale } from '/imports/startup/i18n';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import { describePattern } from '/imports/ui/listing/recurringText';
import {
  worldForPlace,
  worldShapeColors,
  type LocationWorld,
} from '/imports/ui/utils/locationPalette';

import {
  SHARE_IMAGE_HEIGHT as H,
  SHARE_IMAGE_WIDTH as W,
  activityHasShareImage,
  activityShareFingerprint,
  locationShareFingerprint,
  resourceShareFingerprint,
  type ShareImageKind,
  type ShareableActivity,
  type ShareableLocation,
  type ShareableResource,
} from './shareImage';

// Draws the share images (see shareImage.ts) with sharp: the text is set
// by Pango in the site's own typefaces, shipped in private/share/fonts
// because the server has no fonts of its own, and the picture without a
// photo uses the same generated shapes as the cards.

declare const Assets: { absoluteFilePath(assetPath: string): string };

const STORAGE_DIR = 'share';

const COLORS = {
  green: '#1a4b1e',
  ink: '#22302a',
  soft: '#5b6152',
  tegel: '#a6482a',
  paper: '#fffdf7',
};

const FONTS = {
  display: { file: 'fonts/fraunces-700.ttf', family: 'Fraunces 144pt Soft' },
  ui: { file: 'fonts/raleway-600.ttf', family: 'Raleway SemiBold' },
  uiBold: { file: 'fonts/raleway-800.ttf', family: 'Raleway ExtraBold' },
};

type Font = keyof typeof FONTS;

const asset = (name: string) => Assets.absoluteFilePath(`share/${name}`);

// --- Text --------------------------------------------------------------

const escapeMarkup = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface TextLayer {
  data: Buffer;
  width: number;
  height: number;
}

interface TextOptions {
  font: Font;
  size: number;
  color: string;
  width?: number;
  letterSpacing?: number; // em
  lineHeight?: number; // extra points between lines
}

async function renderText(
  text: string,
  { font, size, color, width, letterSpacing = 0, lineHeight = 0 }: TextOptions
): Promise<TextLayer> {
  const { file, family } = FONTS[font];
  // Pango's letter_spacing is in 1/1024 of a point
  const spacing = Math.round(letterSpacing * size * 1024);
  const markup = `<span foreground="${color}" letter_spacing="${spacing}">${escapeMarkup(
    text
  )}</span>`;
  const { data, info } = await sharp({
    text: {
      text: markup,
      font: `${family} ${size}`,
      fontfile: asset(file),
      width,
      dpi: 72,
      rgba: true,
      wrap: 'word',
      spacing: lineHeight,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// The title as large as it fits in `maxLines`, shortened with an ellipsis
// when even the smallest size does not.
async function renderTitle(
  title: string,
  width: number,
  maxLines: number,
  maxSize = 76,
  color: string = COLORS.green
): Promise<TextLayer> {
  const sizes = [76, 68, 60, 54, 48].filter((size) => size <= maxSize);
  const fits = (layer: TextLayer, size: number) =>
    layer.height <= size * 1.3 * maxLines;
  for (const size of sizes) {
    const layer = await renderText(title, {
      font: 'display',
      size,
      color,
      width,
    });
    if (fits(layer, size)) {
      return layer;
    }
  }
  const size = sizes[sizes.length - 1];
  const words = title.split(/\s+/);
  for (let count = words.length - 1; count > 0; count -= 1) {
    const layer = await renderText(`${words.slice(0, count).join(' ')}…`, {
      font: 'display',
      size,
      color,
      width,
    });
    if (fits(layer, size)) {
      return layer;
    }
  }
  return renderText(title.slice(0, 40), {
    font: 'display',
    size,
    color,
    width,
  });
}

// --- Pictures ------------------------------------------------------------

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
}

const MAX_REMOTE_BYTES = 15 * 1024 * 1024;

// The bytes of an image reference as the entries store them: an Images
// document id, a variants object, a URL on this server or elsewhere.
async function loadImage(ref: unknown): Promise<Buffer | null> {
  let url: string | null = null;
  if (typeof ref === 'string') {
    if (/^https?:\/\//i.test(ref) || ref.startsWith('/')) {
      url = ref;
    } else if (/^[a-zA-Z0-9]{17,}$/.test(ref)) {
      const doc = await Images.findOneAsync(ref, { fields: { variants: 1 } });
      url = doc?.variants?.full || null;
    }
  } else if (ref && typeof ref === 'object') {
    const variants = (ref as { variants?: Record<string, string> }).variants;
    const plain = ref as Record<string, string>;
    url = variants?.full || plain.full || plain.src || null;
  }
  if (!url) {
    return null;
  }

  // Stored here: read it from disk instead of over the network. Variant
  // URLs (…/medium.webp) are swapped for the largest one.
  const key = urlToKey(
    url.replace(/\/(thumb|small|medium)(\.\w+)$/, '/full$2')
  );
  if (key) {
    const filePath = resolveMediaPath(key);
    return filePath ? fsp.readFile(filePath).catch(() => null) : null;
  }
  if (!/^https?:\/\//i.test(url)) {
    return null;
  }
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Cocoso share image' },
    });
    if (!response.ok) {
      return null;
    }
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_REMOTE_BYTES) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length > MAX_REMOTE_BYTES ? null : buffer;
  } catch {
    return null;
  }
}

const roundedMask = (w: number, h: number, r: number) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`
  );

// The card's picture in a frame: the photo when there is one, else the
// place's colour world with the generated shapes, as on the event cards.
async function renderPicture(
  photo: Buffer | null,
  seed: string,
  world: LocationWorld,
  { w, h, radius }: Frame
): Promise<Buffer> {
  let base: Buffer | null = null;
  if (photo) {
    base = await sharp(photo, { failOn: 'none' })
      .rotate()
      .resize(w, h, { fit: 'cover', position: 'attention' })
      .png()
      .toBuffer()
      .catch(() => null);
  }
  if (!base) {
    const markup = renderToStaticMarkup(
      <PlaceholderImage
        seed={seed}
        palette={worldShapeColors(world)}
        background="none"
      />
    );
    const shapes = markup
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '')
      .replace('fill:none', 'fill:transparent');
    base = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0.45" y2="1">
          <stop offset="0" stop-color="${world.from}"/>
          <stop offset="1" stop-color="${world.to}"/>
        </linearGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#g)"/>
        <svg width="${w}" height="${h}" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" opacity="0.55">${shapes}</svg>
      </svg>`
    );
  }
  const sized = sharp(base).resize(w, h);
  return (
    radius
      ? sized.composite([
          { input: roundedMask(w, h, radius), blend: 'dest-in' },
        ])
      : sized
  )
    .png()
    .toBuffer();
}

// A photo that loads and is large enough to carry the whole picture
async function usablePhoto(ref: unknown): Promise<Buffer | null> {
  const photo = ref ? await loadImage(ref) : null;
  if (!photo) {
    return null;
  }
  const meta = await sharp(photo, { failOn: 'none' })
    .metadata()
    .catch(() => null);
  return meta?.width ? photo : null;
}

// The almanac label from the cards: the day large, the month (or "varje
// vecka") small in tegel.
async function renderStamp(day: string, small: string) {
  const dayLayer = await renderText(day, {
    font: 'display',
    size: day.length > 3 ? 52 : 64,
    color: COLORS.ink,
  });
  const monthLayer = await renderText(small.toUpperCase(), {
    font: 'uiBold',
    size: 20,
    color: COLORS.tegel,
    letterSpacing: 0.1,
  });
  const w = Math.max(116, dayLayer.width + 44, monthLayer.width + 40);
  const h = dayLayer.height + monthLayer.height + 26;
  const card = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 24}" height="${
      h + 24
    }">
      <defs><filter id="s" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#3c2814" flood-opacity="0.28"/>
      </filter></defs>
      <rect x="12" y="8" width="${w}" height="${h}" rx="16" fill="${
      COLORS.paper
    }" filter="url(#s)"/>
    </svg>`
  );
  return sharp(card)
    .composite([
      {
        input: dayLayer.data,
        left: 12 + Math.round((w - dayLayer.width) / 2),
        top: 8 + 12,
      },
      {
        input: monthLayer.data,
        left: 12 + Math.round((w - monthLayer.width) / 2),
        top: 8 + 12 + dayLayer.height + 4,
      },
    ])
    .png()
    .toBuffer();
}

// --- Composition -----------------------------------------------------------

const background = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f1f0dc"/>
        <stop offset="0.55" stop-color="#ecebd5"/>
        <stop offset="1" stop-color="#e6dec0"/>
      </linearGradient>
      <radialGradient id="warm" cx="1" cy="0" r="0.9">
        <stop offset="0" stop-color="#e1d4ad"/>
        <stop offset="1" stop-color="#e1d4ad" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="clay" cx="0" cy="1" r="0.7">
        <stop offset="0" stop-color="#e3d7c2"/>
        <stop offset="1" stop-color="#e3d7c2" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M8 0H0V8" fill="none" stroke="#786e50" stroke-opacity="0.05"/>
      </pattern>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#base)"/>
    <rect width="${W}" height="${H}" fill="url(#warm)"/>
    <rect width="${W}" height="${H}" fill="url(#clay)"/>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
  </svg>`
);

// lucide's calendar and map-pin, stroked in the text colour
const ICONS = {
  calendar:
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
};

const icon = (name: keyof typeof ICONS, size: number, color: string) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`
  );

interface InfoLine {
  icon?: keyof typeof ICONS;
  text: string;
  muted?: boolean;
}

interface CardContent {
  kicker: string;
  /** Used instead of the kicker when that does not fit on one line */
  kickerShort?: string;
  title: string;
  /** A line under the title: the event's subtitle */
  subtitle?: string;
  /** The description, quieter, as much as there is room for */
  summary?: string;
  lines: InfoLine[];
  /** What the picture is made of */
  art: {
    imageRef: unknown;
    seed: string;
    world: LocationWorld;
    /** "event:<kind>", "resource:<kind>" or "location"; picks the layout */
    kind?: string;
  };
  stamp?: Buffer | null;
  siteName: string;
}

// --- Layouts -----------------------------------------------------------------
//
// Entries do not all look alike: the kind of event or venue picks one of a
// few layouts (LAYOUT_BY_KIND below), places (orter) are drawn in their own
// colour, and anything without a kind gets one picked from its id. The
// kind is part of the image's fingerprint, so a new kind gives a new URL.
//
// - card:   the paper ground, text left, the photo framed on the right
// - mirror: the same with the photo on the left and the text on the right
// - poster: the photo across the whole picture, the text light on a
//           darkening fade from the left (only with a real photo)
// - band:   the place's colour (forest, clay, glass …) as a field on the
//           left with light text, the photo filling the right side

type LayoutName = 'card' | 'mirror' | 'poster' | 'band';

interface Palette {
  title: string;
  ink: string;
  soft: string;
  accent: string;
  site: string;
}

interface Layout {
  name: LayoutName;
  text: { x: number; w: number };
  picture: Frame;
  palette: Palette;
  /** Where the date label goes, given its width */
  stamp: (width: number) => { left: number; top: number };
  shadow: boolean;
}

const ON_PAPER: Palette = {
  title: COLORS.green,
  ink: COLORS.ink,
  soft: COLORS.soft,
  accent: COLORS.tegel,
  site: COLORS.green,
};

const ON_DARK: Palette = {
  title: COLORS.paper,
  ink: '#f4efe4',
  soft: '#ddd5c4',
  accent: '#f2a782',
  site: COLORS.paper,
};

function makeLayout(name: LayoutName, world: LocationWorld): Layout {
  switch (name) {
    case 'mirror': {
      const picture = { x: 48, y: 48, w: 428, h: 534, radius: 30 };
      return {
        name,
        text: { x: 540, w: W - 540 - 60 },
        picture,
        palette: ON_PAPER,
        stamp: (width) => ({
          left: picture.x + picture.w - width + 34,
          top: picture.y + 28,
        }),
        shadow: true,
      };
    }
    case 'poster':
      return {
        name,
        text: { x: 72, w: 600 },
        picture: { x: 0, y: 0, w: W, h: H, radius: 0 },
        palette: ON_DARK,
        stamp: (width) => ({ left: W - width - 44, top: 40 }),
        shadow: false,
      };
    case 'band': {
      const picture = { x: 680, y: 0, w: W - 680, h: H, radius: 0 };
      return {
        name,
        text: { x: 64, w: 560 },
        picture,
        palette: { ...ON_DARK, accent: world.from, soft: world.tint },
        stamp: (width) => ({ left: picture.x - width / 2, top: 40 }),
        shadow: false,
      };
    }
    default: {
      const picture = { x: 724, y: 48, w: 428, h: 534, radius: 30 };
      return {
        name: 'card',
        text: { x: 72, w: picture.x - 72 - 56 },
        picture,
        palette: ON_PAPER,
        stamp: () => ({ left: picture.x - 34, top: picture.y + 28 }),
        shadow: true,
      };
    }
  }
}

// Which layout each kind gets: the big pictures of culture, film and
// sights as posters, the outdoors and the social in the place's colour,
// sports and learning mirrored, and the everyday as the card.
const LAYOUT_BY_KIND: Record<string, LayoutName> = {
  'event:kultur': 'poster',
  'event:bio': 'poster',
  'event:natur': 'band',
  'event:social': 'band',
  'event:idrott': 'mirror',
  'event:larande': 'mirror',
  'event:barn': 'card',
  'event:senior': 'card',
  'resource:sevardhet': 'poster',
  'resource:kultur': 'mirror',
  'resource:friluft': 'band',
  'resource:bad': 'band',
  'resource:idrottshall': 'card',
  'resource:idrottsplats': 'card',
  location: 'band',
};

// An entry with several kinds is drawn as its most telling one: the
// specific kinds before the broad ones ("Barn & familj" before "Kultur").
const KIND_PRIORITY: Record<'event' | 'resource', string[]> = {
  event: [
    'bio',
    'natur',
    'barn',
    'senior',
    'idrott',
    'larande',
    'social',
    'kultur',
  ],
  resource: [
    'sevardhet',
    'bad',
    'friluft',
    'idrottsplats',
    'idrottshall',
    'kultur',
  ],
};

function layoutKind(
  type: 'event' | 'resource',
  kinds: string[]
): string | undefined {
  const kind =
    KIND_PRIORITY[type].find((key) => kinds.includes(key)) || kinds[0];
  return kind && `${type}:${kind}`;
}

function layoutFor(
  kind: string | undefined,
  seed: string,
  hasPhoto: boolean
): LayoutName {
  const byKind = kind ? LAYOUT_BY_KIND[kind] : undefined;
  if (byKind) {
    // A poster needs a photo; without one the place's colour carries it
    return byKind === 'poster' && !hasPhoto ? 'band' : byKind;
  }
  // FNV-1a over the id, so the pick is the same on every server
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const names: LayoutName[] = hasPhoto
    ? ['card', 'mirror', 'poster', 'band']
    : ['card', 'mirror', 'band'];
  return names[hash % names.length];
}

// The ground behind it all
function groundFor(layout: Layout, world: LocationWorld): Buffer {
  if (layout.name === 'band') {
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stop-color="${world.to}"/>
            <stop offset="1" stop-color="${world.ink}"/>
          </linearGradient>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M8 0H0V8" fill="none" stroke="#ffffff" stroke-opacity="0.05"/>
          </pattern>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#g)"/>
        <rect width="${W}" height="${H}" fill="url(#grid)"/>
      </svg>`
    );
  }
  return background;
}

// Over the photo of a poster: dark on the text's side, clear on the other
const posterFade = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="f" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#1c1610" stop-opacity="0.9"/>
        <stop offset="0.5" stop-color="#1c1610" stop-opacity="0.8"/>
        <stop offset="0.8" stop-color="#1c1610" stop-opacity="0.15"/>
        <stop offset="1" stop-color="#1c1610" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.6" stop-color="#1c1610" stop-opacity="0"/>
        <stop offset="1" stop-color="#1c1610" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#f)"/>
    <rect width="${W}" height="${H}" fill="url(#b)"/>
  </svg>`
);

const FOOTER_H = 96;
const TEXT_TOP = 44;
// The text block ends this far above the site's name
const TEXT_BOTTOM = H - FOOTER_H - 28;

const trimEnd = (text: string) => text.replace(/[\s,.;:–—-]+$/, '');

// The text in at most `maxLines` lines, cut after a word with an ellipsis
// when it is longer; null when nothing fits.
async function renderClamped(
  text: string | undefined,
  options: TextOptions,
  maxLines: number
): Promise<TextLayer | null> {
  if (!text || maxLines <= 0) {
    return null;
  }
  const oneLine = await renderText('Åg', { ...options, width: undefined });
  const limit =
    oneLine.height * maxLines + (options.lineHeight || 0) * (maxLines - 1) + 4;
  const whole = await renderText(text, options);
  if (whole.height <= limit) {
    return whole;
  }
  const words = text.split(/\s+/);
  let low = 1;
  let high = words.length - 1;
  let best: TextLayer | null = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const layer = await renderText(
      `${trimEnd(words.slice(0, middle).join(' '))}…`,
      options
    );
    if (layer.height <= limit) {
      best = layer;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return best;
}

// How many lines title, subtitle and description get, roomiest first; the
// first that leaves room for the dates and the place is used.
const TEXT_PLANS: Array<[number, number, number]> = [
  [3, 2, 3],
  [2, 2, 3],
  [2, 2, 2],
  [2, 1, 2],
  [2, 1, 1],
  [2, 1, 0],
  [2, 0, 0],
  [1, 0, 0],
];

async function composeCard(content: CardContent): Promise<Buffer> {
  const { imageRef, seed, world, kind } = content.art;
  const photo = await usablePhoto(imageRef);
  const layout = makeLayout(layoutFor(kind, seed, Boolean(photo)), world);
  const { palette } = layout;
  const textX = layout.text.x;
  const textW = layout.text.w;
  const picture = await renderPicture(photo, seed, world, layout.picture);
  const subtitleStyle: TextOptions = {
    font: 'ui',
    size: 27,
    color: palette.ink,
    width: textW,
  };
  const summaryStyle: TextOptions = {
    font: 'ui',
    size: 23,
    color: palette.soft,
    width: textW,
    lineHeight: 3,
  };

  const layers: sharp.OverlayOptions[] = [];
  // Under the text: the photo (poster) or the framed photo with its shadow
  if (layout.name === 'poster') {
    layers.push({ input: picture, left: 0, top: 0 });
    layers.push({ input: posterFade, left: 0, top: 0 });
  } else {
    const frame = layout.picture;
    if (layout.shadow) {
      layers.push({
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
            <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="16"/>
            </filter></defs>
            <rect x="${frame.x + 6}" y="${frame.y + 18}" width="${
            frame.w - 12
          }" height="${frame.h - 12}" rx="${
            frame.radius
          }" fill="#3c2814" fill-opacity="0.32" filter="url(#s)"/>
          </svg>`
        ),
        left: 0,
        top: 0,
      });
    }
    layers.push({ input: picture, left: frame.x, top: frame.y });
  }

  const kickerStyle: TextOptions = {
    font: 'uiBold',
    size: 22,
    color: palette.accent,
    letterSpacing: 0.14,
  };
  let kicker = await renderText(content.kicker.toUpperCase(), kickerStyle);
  if (kicker.width > textW) {
    kicker = await renderText(
      (content.kickerShort || content.kicker).toUpperCase(),
      { ...kickerStyle, width: textW }
    );
  }
  // A title with text under it is set a size smaller, so the text has room
  const titleMax = content.subtitle || content.summary ? 64 : 76;
  // Lines with an icon, and the quieter lines under them, share an indent
  const lines = await Promise.all(
    content.lines.map(async (line, index) => {
      const indent = line.icon || (line.muted && index > 0) ? 46 : 0;
      return {
        line,
        indent,
        layer: await renderText(line.text, {
          font: 'ui',
          size: line.muted ? 25 : 29,
          color: line.muted ? palette.soft : palette.ink,
          width: textW - indent,
        }),
      };
    })
  );

  const gaps = { kicker: 22, title: 14, subtitle: 10, text: 28, line: 12 };
  const linesHeight =
    lines.reduce((sum, { layer }) => sum + layer.height, 0) +
    Math.max(0, lines.length - 1) * gaps.line;

  // Each part is drawn once per number of lines it is tried with
  const drawn = new Map<string, Promise<TextLayer | null>>();
  const once = (key: string, draw: () => Promise<TextLayer | null>) => {
    if (!drawn.has(key)) {
      drawn.set(key, draw());
    }
    return drawn.get(key) as Promise<TextLayer | null>;
  };

  let parts: (TextLayer | null)[] = [];
  let blockHeight = 0;
  for (const [titleLines, subtitleLines, summaryLines] of TEXT_PLANS) {
    parts = await Promise.all([
      once(`t${titleLines}`, () =>
        renderTitle(content.title, textW, titleLines, titleMax, palette.title)
      ),
      once(`s${subtitleLines}`, () =>
        renderClamped(content.subtitle, subtitleStyle, subtitleLines)
      ),
      once(`d${summaryLines}`, () =>
        renderClamped(content.summary, summaryStyle, summaryLines)
      ),
    ]);
    const [title, subtitle, summary] = parts;
    blockHeight =
      kicker.height +
      gaps.kicker +
      (title?.height || 0) +
      (subtitle ? gaps.title + subtitle.height : 0) +
      (summary ? (subtitle ? gaps.subtitle : gaps.title) + summary.height : 0) +
      (lines.length ? gaps.text + linesHeight : 0);
    if (blockHeight <= TEXT_BOTTOM - TEXT_TOP) {
      break;
    }
  }
  const [title, subtitle, summary] = parts;

  // The text block centred in the space above the footer
  let y = Math.max(
    TEXT_TOP,
    Math.round((TEXT_BOTTOM + TEXT_TOP - blockHeight) / 2)
  );
  layers.push({ input: kicker.data, left: textX, top: y });
  y += kicker.height + gaps.kicker;
  if (title) {
    layers.push({ input: title.data, left: textX, top: y });
    y += title.height;
  }
  if (subtitle) {
    y += gaps.title;
    layers.push({ input: subtitle.data, left: textX, top: y });
    y += subtitle.height;
  }
  if (summary) {
    y += subtitle ? gaps.subtitle : gaps.title;
    layers.push({ input: summary.data, left: textX, top: y });
    y += summary.height;
  }
  y += gaps.text;
  lines.forEach(({ line, indent, layer }) => {
    if (line.icon) {
      layers.push({
        input: icon(line.icon, 30, palette.accent),
        left: textX,
        top: y + Math.max(0, Math.round((Math.min(layer.height, 40) - 30) / 2)),
      });
    }
    layers.push({ input: layer.data, left: textX + indent, top: y });
    y += layer.height + gaps.line;
  });

  // The footer: the site's name
  const siteName = await renderText(content.siteName, {
    font: 'uiBold',
    size: 22,
    color: palette.site,
    width: textW,
  });
  layers.push({
    input: siteName.data,
    left: textX,
    top: H - 48 - 54 + Math.round((54 - siteName.height) / 2) + 4,
  });

  // The date label on the picture's corner
  if (content.stamp) {
    const { width = 140 } = await sharp(content.stamp).metadata();
    layers.push({
      input: content.stamp,
      ...roundPosition(layout.stamp(width)),
    });
  }

  return sharp(groundFor(layout, world))
    .composite(layers)
    .flatten({ background: '#f1f0dc' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

const roundPosition = ({ left, top }: { left: number; top: number }) => ({
  left: Math.round(left),
  top: Math.round(top),
});

// --- Entries -----------------------------------------------------------------

const capitalize = (text: string) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

async function siteContext() {
  const site = await getSite({ settings: 1 });
  const lang = site?.settings?.lang || 'sv';
  const t = (key: string, options: Record<string, unknown> = {}) =>
    String(translate(`common:${key}`, options, lang));
  return { lang, t, siteName: site?.settings?.name || '' };
}

async function placesInOrder() {
  return Locations.find(
    { isPublished: true },
    { fields: { _id: 1, name: 1, colorKey: 1 }, sort: { order: 1, name: 1 } }
  ).fetchAsync();
}

interface DateEntry {
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

// The dates as they stay true. A link preview is cached by Facebook,
// WhatsApp and the rest and shown for as long as the post lives, so the
// picture never says "next time" or "in three days": a single date with
// its year, a weekly rhythm with the period it runs, or the span of an
// irregular series with its number of dates.
function describeDates(
  datesAndTimes: DateEntry[],
  t: (key: string, options?: Record<string, unknown>) => string,
  lang: string
): { lines: InfoLine[]; stamp: { day: string; small: string } | null } {
  const dates = [...datesAndTimes].sort((a, b) =>
    `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`)
  );
  if (!dates.length) {
    return { lines: [] as InfoLine[], stamp: null };
  }
  const first = dates[0];
  const last = dates[dates.length - 1];
  const start = dayjs(first.startDate);
  const end = dayjs(last.endDate || last.startDate);
  const times = (d: DateEntry) =>
    [d.startTime, d.endTime].filter(Boolean).join('–');

  // "5 december 2026", "3–5 december 2026", "30 november – 2 december 2026"
  const span = () => {
    if (start.isSame(end, 'day')) {
      return start.format('D MMMM YYYY');
    }
    if (start.isSame(end, 'month')) {
      return `${start.format('D')}–${end.format('D MMMM YYYY')}`;
    }
    return start.isSame(end, 'year')
      ? `${start.format('D MMMM')} – ${end.format('D MMMM YYYY')}`
      : `${start.format('D MMMM YYYY')} – ${end.format('D MMMM YYYY')}`;
  };
  const dateStamp = {
    day:
      first.endDate && first.endDate !== first.startDate
        ? `${start.format('D')}–${dayjs(first.endDate).format('D')}`
        : start.format('D'),
    small: start.format('MMM').replace('.', ''),
  };

  if (dates.length === 1) {
    const when = start.isSame(end, 'day')
      ? capitalize(start.format('dddd D MMMM YYYY'))
      : span();
    const time = times(first);
    return {
      stamp: dateStamp,
      lines: [
        { icon: 'calendar' as const, text: time ? `${when}, ${time}` : when },
      ],
    };
  }

  const pattern = getWeeklyPattern(dates);
  if (pattern) {
    const weekdays = [...new Set(pattern.slots.map((slot) => slot.weekday))];
    return {
      // One weekday: "Tis / varje vecka" on the label; several do not fit
      stamp:
        weekdays.length === 1
          ? {
              day: capitalize(
                dayjs().day(weekdays[0]).format('ddd').replace('.', '')
              ),
              small: t(
                pattern.intervalWeeks === 2
                  ? 'shareImage.everyOtherWeek'
                  : 'shareImage.everyWeek'
              ),
            }
          : null,
      lines: [
        {
          icon: 'calendar' as const,
          text: capitalize(describePattern(pattern, t as never, lang)),
        },
        { muted: true, text: span() },
      ],
    };
  }

  // A few dates are named ("21 november och 12 december 2026"), more are
  // given as their span; the label says how many. The time goes under
  // them when it is the same every time.
  const sameYear = start.isSame(end, 'year');
  const listed =
    dates.length <= 3
      ? `${joinList(
          dates.map((d) =>
            dayjs(d.startDate).format(sameYear ? 'D MMMM' : 'D MMMM YYYY')
          ),
          lang
        )}${sameYear ? ` ${end.format('YYYY')}` : ''}`
      : span();
  const allTimes = [...new Set(dates.map(times))];
  const lines: InfoLine[] = [{ icon: 'calendar', text: capitalize(listed) }];
  if (allTimes.length === 1 && allTimes[0]) {
    lines.push({ muted: true, text: allTimes[0] });
  }
  return {
    stamp: { day: String(dates.length), small: t('shareImage.dates') },
    lines,
  };
}

const joinList = (items: string[], lang: string) => {
  try {
    return new Intl.ListFormat(lang, { type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
};

async function drawActivity(activity: ShareableActivity): Promise<Buffer> {
  const { lang, t, siteName } = await siteContext();
  const places = await placesInOrder();
  const index = places.findIndex((p) => p._id === activity.locationId);
  const place = index === -1 ? null : places[index];
  const world = worldForPlace(place || undefined, Math.max(index, 0));

  // dayjs has one global locale; everything that formats a date runs
  // synchronously right after it is set.
  setDayjsLocale(lang);
  const { lines, stamp } = describeDates(activity.datesAndTimes || [], t, lang);

  // The venue; the place is named above the title already
  const where = activity.resource || activity.place || place?.name;
  if (where) {
    lines.push({ icon: 'pin', text: where });
  }

  const stampLayer = stamp ? await renderStamp(stamp.day, stamp.small) : null;

  // The subtitle under the title, then as much of the description as
  // fits (unless it only repeats the subtitle)
  const subtitle = plainText(activity.subTitle);
  const description = withoutCredits(plainText(activity.longDescription));
  return composeCard({
    kicker: [t('shareImage.event'), place?.name].filter(Boolean).join(' · '),
    title: activity.title || '',
    subtitle,
    summary:
      description && !(subtitle && description.startsWith(subtitle))
        ? shorten(description, 320)
        : undefined,
    lines,
    art: {
      imageRef: (activity.images && activity.images[0]) || activity.imageUrl,
      seed: activity._id || activity.title || '',
      world,
      kind: layoutKind('event', kindsOf(activity)),
    },
    stamp: stampLayer,
    siteName,
  });
}

const plainText = (html?: string | null) =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

// Descriptions often end with the photo's credit ("Foto: … (CC BY-SA 4.0,
// Wikimedia Commons)."), which is not for the picture.
const withoutCredits = (text: string) =>
  text.replace(/(^|[.!?]\s+)(foto|bild|photo|image)\s*:[^]*$/i, '$1').trim();

const shorten = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;

async function drawLocation(location: ShareableLocation): Promise<Buffer> {
  const { t, siteName } = await siteContext();
  const places = await placesInOrder();
  const index = Math.max(
    places.findIndex((p) => p._id === location._id),
    0
  );
  const world = worldForPlace(location, index);
  return composeCard({
    kicker: t('shareImage.welcome'),
    title: location.name || '',
    summary: shorten(withoutCredits(plainText(location.description)), 320),
    lines: [],
    art: {
      imageRef: location.images?.[0],
      seed: location._id || location.name || '',
      world,
      kind: 'location',
    },
    siteName,
  });
}

// A place to be (lokal): its kind and the ort above the name, the
// description, the address.
async function drawResource(resource: ShareableResource): Promise<Buffer> {
  const { t, siteName } = await siteContext();
  const places = await placesInOrder();
  const index = places.findIndex((p) => p._id === resource.locationId);
  const place = index === -1 ? null : places[index];
  const world = worldForPlace(place || undefined, Math.max(index, 0));
  const kind = kindsOf(resource)[0];
  const address = formatAddress(resource.address as never);
  return composeCard({
    kicker: [
      kind ? t(`resourceKinds.${kind}`) : t('shareImage.resource'),
      place?.name,
    ]
      .filter(Boolean)
      .join(' · '),
    kickerShort: kind ? t(`resourceKinds.${kind}`) : t('shareImage.resource'),
    title: resource.label || '',
    summary: shorten(withoutCredits(plainText(resource.description)), 320),
    lines: address ? [{ icon: 'pin', text: address }] : [],
    art: {
      imageRef: resource.images?.[0],
      seed: resource._id || resource.label || '',
      world,
      kind: layoutKind('resource', kindsOf(resource)),
    },
    siteName,
  });
}

// --- Storage -----------------------------------------------------------------

interface ShareImage {
  buffer: Buffer;
  fingerprint: string;
}

interface Entry {
  fingerprint: string;
  keep: boolean;
  draw: () => Promise<Buffer>;
}

async function findEntry(
  kind: ShareImageKind,
  id: string
): Promise<Entry | null> {
  if (kind === 'activity') {
    const activity = await Activities.findOneAsync(
      { _id: id },
      {
        fields: {
          title: 1,
          subTitle: 1,
          longDescription: 1,
          resource: 1,
          place: 1,
          locationId: 1,
          kinds: 1,
          category: 1,
          images: 1,
          imageUrl: 1,
          datesAndTimes: 1,
          isArchived: 1,
        },
      }
    );
    if (!activity || activity.isArchived) {
      return null;
    }
    return {
      fingerprint: activityShareFingerprint(activity),
      // An event with no dates left is drawn when asked but not kept
      keep: activityHasShareImage(activity),
      draw: () => drawActivity(activity),
    };
  }
  if (kind === 'resource') {
    const resource = await Resources.findOneAsync({ _id: id });
    if (!resource) {
      return null;
    }
    return {
      fingerprint: resourceShareFingerprint(resource),
      keep: true,
      draw: () => drawResource(resource),
    };
  }
  const location = await Locations.findOneAsync({ _id: id, isPublished: true });
  if (!location) {
    return null;
  }
  return {
    fingerprint: locationShareFingerprint(location),
    keep: true,
    draw: () => drawLocation(location),
  };
}

const storageKey = (kind: ShareImageKind, id: string, fingerprint: string) =>
  `${STORAGE_DIR}/${kind}/${id}/${fingerprint}.jpg`;

const pending = new Map<string, Promise<Buffer>>();

// The entry's current share image: from disk when it has been drawn
// before, else drawn now (once, however many crawlers ask at the same
// time) and kept in place of the entry's older ones.
export async function getShareImage(
  kind: ShareImageKind,
  id: string
): Promise<ShareImage | null> {
  if (!/^[A-Za-z0-9]{1,40}$/.test(id)) {
    return null;
  }
  const entry = await findEntry(kind, id);
  if (!entry) {
    return null;
  }
  const key = storageKey(kind, id, entry.fingerprint);
  if (await mediaExists(key)) {
    const filePath = resolveMediaPath(key) as string;
    return {
      buffer: await fsp.readFile(filePath),
      fingerprint: entry.fingerprint,
    };
  }

  let drawing = pending.get(key);
  if (!drawing) {
    drawing = (async () => {
      const buffer = await entry.draw();
      if (entry.keep) {
        await removeShareImages(kind, id);
        await saveMedia(buffer, key);
      }
      return buffer;
    })().finally(() => pending.delete(key));
    pending.set(key, drawing);
  }
  return { buffer: await drawing, fingerprint: entry.fingerprint };
}

// Draws an entry's picture right after it is saved, so it is ready when
// the link is first shared: Facebook and WhatsApp give up on an image that
// takes long, and the first preview is the one that stays.
export function warmShareImage(kind: ShareImageKind, id: string): void {
  Meteor.defer(() => {
    getShareImage(kind, id).catch((error) =>
      console.error('[share-image] could not draw', kind, id, error)
    );
  });
}

export async function removeShareImages(
  kind: ShareImageKind,
  id: string
): Promise<void> {
  const dir = resolveMediaPath(`${STORAGE_DIR}/${kind}/${id}`);
  if (dir) {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

// Clears out the pictures nobody needs any more: of events with no dates
// left (or removed, or archived) and of places that are gone or hidden.
export async function sweepShareImages(): Promise<number> {
  let removed = 0;
  for (const kind of ['activity', 'location', 'resource'] as ShareImageKind[]) {
    const dir = path.join(getMediaStorageRoot(), STORAGE_DIR, kind);
    const ids = await fsp.readdir(dir).catch(() => [] as string[]);
    for (const id of ids) {
      const entry = await findEntry(kind, id);
      if (!entry || !entry.keep) {
        await removeShareImages(kind, id);
        removed += 1;
      }
    }
  }
  return removed;
}

export const isShareImageKind = (kind: string): kind is ShareImageKind =>
  kind === 'activity' || kind === 'location' || kind === 'resource';

if (Meteor.isServer && !Meteor.isTest) {
  Meteor.startup(() => {
    const sweep = () =>
      sweepShareImages()
        .then((count) => {
          if (count) {
            console.info(
              `[share-image] removed ${count} unused share image(s)`
            );
          }
        })
        .catch((error) => console.error('[share-image] sweep failed', error));
    Meteor.setTimeout(sweep, 60 * 1000);
    Meteor.setInterval(sweep, 6 * 60 * 60 * 1000);
  });
}

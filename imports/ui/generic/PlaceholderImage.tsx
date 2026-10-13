import React from 'react';

/**
 * A stand-in for content that has no image: a composition of abstract
 * shapes in the site's theme colours. The composition is derived
 * deterministically from `seed` (an id or a title), so the same item
 * always gets the same picture and the server-rendered markup matches
 * what the client hydrates.
 */

const VIEW_W = 400;
const VIEW_H = 300;

// FNV-1a: turns any string into a 32-bit number.
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

// mulberry32: a tiny seeded generator returning numbers in [0, 1).
function makeRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHADES = [200, 300, 400, 500, 600] as const;

function themeColor(shade: number): string {
  return `var(--cocoso-colors-theme-${shade})`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ring'; cx: number; cy: number; r: number; width: number }
  | {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      rx: number;
      rotate: number;
    }
  | { kind: 'triangle'; points: string }
  | { kind: 'blob'; d: string };

interface ShapeWithStyle {
  shape: Shape;
  shade: number;
  opacity: number;
}

function makeTriangle(random: () => number): Shape {
  const cx = random() * VIEW_W;
  const cy = random() * VIEW_H;
  const size = 50 + random() * 110;
  const angle = random() * Math.PI * 2;
  const points = [0, 1, 2]
    .map((i) => {
      const a = angle + (i * Math.PI * 2) / 3;
      return `${round(cx + Math.cos(a) * size)},${round(cy + Math.sin(a) * size)}`;
    })
    .join(' ');
  return { kind: 'triangle', points };
}

function makeBlob(random: () => number): Shape {
  const cx = random() * VIEW_W;
  const cy = random() * VIEW_H;
  const base = 60 + random() * 80;
  const steps = 6;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i * Math.PI * 2) / steps;
    const r = base * (0.7 + random() * 0.6);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  // Smooth closed curve through the points using quadratic midpoints.
  let d = '';
  for (let i = 0; i < steps; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % steps];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    if (i === 0) {
      const [px, py] = pts[steps - 1];
      d += `M ${round((px + x0) / 2)} ${round((py + y0) / 2)} `;
    }
    d += `Q ${round(x0)} ${round(y0)} ${round(mx)} ${round(my)} `;
  }
  return { kind: 'blob', d: `${d}Z` };
}

export function composeShapes(seed: string): ShapeWithStyle[] {
  const random = makeRandom(hashString(seed || 'cocoso'));
  const count = 4 + Math.floor(random() * 4);
  const shapes: ShapeWithStyle[] = [];

  for (let i = 0; i < count; i += 1) {
    const pick = random();
    let shape: Shape;
    if (pick < 0.3) {
      shape = {
        kind: 'circle',
        cx: round(random() * VIEW_W),
        cy: round(random() * VIEW_H),
        r: round(30 + random() * 90),
      };
    } else if (pick < 0.45) {
      shape = {
        kind: 'ring',
        cx: round(random() * VIEW_W),
        cy: round(random() * VIEW_H),
        r: round(40 + random() * 80),
        width: round(8 + random() * 18),
      };
    } else if (pick < 0.7) {
      const w = 60 + random() * 160;
      const h = 40 + random() * 140;
      shape = {
        kind: 'rect',
        x: round(random() * VIEW_W - w / 2),
        y: round(random() * VIEW_H - h / 2),
        w: round(w),
        h: round(h),
        rx: round(random() < 0.5 ? 0 : 8 + random() * 30),
        rotate: round(random() * 90 - 45),
      };
    } else if (pick < 0.85) {
      shape = makeTriangle(random);
    } else {
      shape = makeBlob(random);
    }

    shapes.push({
      shape,
      shade: SHADES[Math.floor(random() * SHADES.length)],
      opacity: round(0.55 + random() * 0.4),
    });
  }

  return shapes;
}

function renderShape(
  { shape, shade, opacity }: ShapeWithStyle,
  key: number,
  palette?: string[]
) {
  const fill = palette
    ? palette[SHADES.indexOf(shade as (typeof SHADES)[number]) % palette.length]
    : themeColor(shade);
  switch (shape.kind) {
    case 'circle':
      return (
        <circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          style={{ fill, opacity }}
        />
      );
    case 'ring':
      return (
        <circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          style={{ fill: 'none', stroke: fill, strokeWidth: shape.width, opacity }}
        />
      );
    case 'rect':
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.w}
          height={shape.h}
          rx={shape.rx}
          transform={`rotate(${shape.rotate} ${round(shape.x + shape.w / 2)} ${round(
            shape.y + shape.h / 2
          )})`}
          style={{ fill, opacity }}
        />
      );
    case 'triangle':
      return <polygon key={key} points={shape.points} style={{ fill, opacity }} />;
    case 'blob':
      return <path key={key} d={shape.d} style={{ fill, opacity }} />;
    default:
      return null;
  }
}

export interface PlaceholderImageProps {
  /** Anything stable that identifies the item: its _id, or failing that its title. */
  seed?: string;
  /** Fills for the shapes, light to dark; the theme's shades when left out. */
  palette?: string[];
  /** The ground behind the shapes; the theme's lightest shade when left out. */
  background?: string;
  /** Accessible description; leave empty for a purely decorative image. */
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function PlaceholderImage({
  seed,
  palette,
  background,
  alt,
  className,
  style,
}: PlaceholderImageProps) {
  const shapes = composeShapes(seed || alt || '');

  return (
    <svg
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role={alt ? 'img' : undefined}
      style={{ display: 'block', height: '100%', width: '100%', ...style }}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width={VIEW_W}
        height={VIEW_H}
        style={{ fill: background || 'var(--cocoso-colors-theme-100)' }}
      />
      {shapes.map((shape, index) => renderShape(shape, index, palette))}
    </svg>
  );
}

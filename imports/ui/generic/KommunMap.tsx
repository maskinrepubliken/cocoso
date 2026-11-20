import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import XIcon from 'lucide-react/dist/esm/icons/x';

import { locationsAtom } from '/imports/state';
import { sitePath } from '/imports/api/_utils/paths';

// The municipality as a small 3D map (public/3dicons/tranemo-kommun.webp)
// that zooms up large when pressed, without a frame: just the map on the
// dimmed page. Over each town's red ball lies a mark that shows the town's
// name on hover or focus; a town that is a location on the site is a link
// to its page.

// Where the balls are in the picture, as fractions of its width, and the
// picture's width / height. Written by the render to
// docs/design/egna-ikoner/tranemo-kommun-marks.json; paste them from there
// when the map is re-rendered. Largest first, so a small town's mark lies
// on top where two overlap.
const ASPECT = 0.8593;
const towns = [
  { name: 'Tranemo', slug: 'tranemo', x: 0.4229, y: 0.4891, r: 0.0739 },
  { name: 'Limmared', slug: 'limmared', x: 0.4139, y: 0.3584, r: 0.046 },
  { name: 'Länghem', slug: 'langhem', x: 0.1918, y: 0.226, r: 0.0368 },
  { name: 'Dalstorp', slug: 'dalstorp', x: 0.6624, y: 0.1778, r: 0.0304 },
  { name: 'Grimsås', slug: 'grimsas', x: 0.8035, y: 0.463, r: 0.0318 },
  { name: 'Ambjörnarp', slug: 'ambjornarp', x: 0.3313, y: 0.6892, r: 0.0227 },
  { name: 'Uddebo', slug: 'uddebo', x: 0.2594, y: 0.5444, r: 0.0206 },
  { name: 'Sjötofta', slug: 'sjotofta', x: 0.3358, y: 0.8904, r: 0.0208 },
  { name: 'Nittorp', slug: 'nittorp', x: 0.6513, y: 0.3175, r: 0.0172 },
  { name: 'Ljungsarp', slug: 'ljungsarp', x: 0.8119, y: 0.2636, r: 0.0163 },
  { name: 'Ölsremma', slug: 'olsremma', x: 0.8401, y: 0.1348, r: 0.0144 },
  { name: 'Månstad', slug: 'manstad', x: 0.3749, y: 0.2063, r: 0.0147 },
  { name: 'Hulared', slug: 'hulared', x: 0.507, y: 0.2162, r: 0.0148 },
];

const ZOOM_MS = 320;

// The page is also rendered on the server, where a layout effect only
// earns a warning; the zoom is measured in the browser alone.
const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface KommunMapProps {
  // The width of the small map, in pixels
  size?: number;
  className?: string;
}

export default function KommunMap({
  size = 132,
  className = '',
}: KommunMapProps) {
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  // The move from the small map's place to the large one's (or back), so
  // the map itself appears to grow out of the icon
  const zoom = useCallback((reverse: boolean) => {
    const figure = figureRef.current;
    const from = triggerRef.current?.getBoundingClientRect();
    if (
      !figure ||
      !from ||
      !figure.animate ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return null;
    }
    const to = figure.getBoundingClientRect();
    const scale = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return figure.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transform: 'none' },
      ],
      {
        duration: ZOOM_MS,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        direction: reverse ? 'reverse' : 'normal',
        fill: 'both',
      }
    );
  }, []);

  const close = useCallback(() => {
    if (closing.current) {
      return;
    }
    const animation = zoom(true);
    if (!animation) {
      setOpen(false);
      return;
    }
    closing.current = true;
    figureRef.current?.parentElement?.classList.add('is-closing');
    animation.onfinish = () => {
      closing.current = false;
      setOpen(false);
    };
  }, [zoom]);

  useBrowserLayoutEffect(() => {
    if (open) {
      zoom(false);
    }
  }, [open, zoom]);

  // Escape closes; the page under the map stays put; focus goes to the
  // cross and back to the small map after
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      trigger?.focus?.();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`kommun-map-trigger ${open ? 'is-open' : ''} ${className}`}
        aria-label={tc('kommunMap.open')}
        title={tc('kommunMap.open')}
        onClick={() => setOpen(true)}
      >
        <img
          alt=""
          decoding="async"
          draggable={false}
          height={Math.round(size / ASPECT)}
          src="/3dicons/tranemo-kommun.webp"
          width={size}
        />
      </button>

      {open &&
        createPortal(
          <div
            className="kommun-map"
            role="dialog"
            aria-modal="true"
            aria-label={tc('kommunMap.label')}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                close();
              }
            }}
          >
            <div
              ref={figureRef}
              className="kommun-map-figure"
              style={{ aspectRatio: String(ASPECT) }}
            >
              <img
                alt={tc('kommunMap.label')}
                className="kommun-map-image"
                draggable={false}
                src="/3dicons/tranemo-kommun-stor.webp"
              />
              {towns.map((town) => {
                const location = locations?.find(
                  (item) => item.slug === town.slug
                );
                const style = {
                  left: `${town.x * 100}%`,
                  top: `${town.y * ASPECT * 100}%`,
                  width: `${town.r * 200}%`,
                };
                const label = (
                  <span className="kommun-map-label">{town.name}</span>
                );
                return location ? (
                  <Link
                    key={town.slug}
                    className="kommun-map-town is-link"
                    style={style}
                    to={sitePath('locations', location.slug)}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                ) : (
                  // focusable, so a tap or the Tab key shows the name too
                  <span
                    key={town.slug}
                    className="kommun-map-town"
                    style={style}
                    tabIndex={0}
                  >
                    {label}
                  </span>
                );
              })}
            </div>

            <button
              ref={closeRef}
              type="button"
              className="lightbox-button lightbox-close"
              aria-label={tc('lightbox.close')}
              onClick={close}
            >
              <XIcon width={18} height={18} />
            </button>

            <a
              className="kommun-map-credit"
              href="https://www.openstreetmap.org/copyright"
              rel="noreferrer"
              target="_blank"
            >
              © OpenStreetMap
            </a>
          </div>,
          document.body
        )}
    </>
  );
}

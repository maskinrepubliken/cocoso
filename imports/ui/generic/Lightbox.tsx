import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRightIcon from 'lucide-react/dist/esm/icons/chevron-right';
import XIcon from 'lucide-react/dist/esm/icons/x';

import { getImageUrl, getImageUrlBest } from '/imports/ui/utils/imageHelper';

// A page's pictures, opened large in a modal and leafed through: arrows,
// the arrow keys, a swipe on a phone; Escape, the cross or a tap beside
// the picture closes it. A page wraps its content in LightboxProvider with
// all its pictures; any picture inside opens at its own place in the list.

interface LightboxContextValue {
  images: string[];
  open: (src: string) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox(): LightboxContextValue | null {
  return useContext(LightboxContext);
}

export interface LightboxProviderProps {
  images?: (string | null | undefined)[];
  alt?: string;
  children: React.ReactNode;
}

export function LightboxProvider({
  images,
  alt,
  children,
}: LightboxProviderProps) {
  const list = useMemo(
    () => (images || []).filter((src): src is string => Boolean(src)),
    [images]
  );
  const [index, setIndex] = useState<number | null>(null);

  const open = useCallback(
    (src: string) => {
      const at = list.indexOf(src);
      setIndex(at === -1 ? 0 : at);
    },
    [list]
  );

  const close = useCallback(() => setIndex(null), []);
  const value = useMemo(() => ({ images: list, open }), [list, open]);

  return (
    <LightboxContext.Provider value={value}>
      {children}
      {index !== null && list.length > 0 && (
        <LightboxModal
          alt={alt}
          images={list}
          index={index}
          onChange={setIndex}
          onClose={close}
        />
      )}
    </LightboxContext.Provider>
  );
}

// A picture that opens the lightbox when there is one around it; without
// a provider (or without a source) it is the plain picture.
export function LightboxTrigger({
  src,
  children,
  className = '',
  showCount = false,
}: {
  src?: string | null;
  children: React.ReactNode;
  className?: string;
  // Mark the trigger with how many pictures there are, when more than one
  showCount?: boolean;
}) {
  const lightbox = useLightbox();
  const [tc] = useTranslation('common');
  if (!lightbox || !src) {
    return <>{children}</>;
  }
  const count = lightbox.images.length;
  return (
    <button
      type="button"
      className={`lightbox-trigger ${className}`}
      aria-label={tc('lightbox.open')}
      onClick={() => lightbox.open(src)}
    >
      {children}
      {showCount && count > 1 && (
        <span className="lightbox-count-badge" aria-hidden>
          1 / {count}
        </span>
      )}
    </button>
  );
}

// The modal on its own, for a component that already knows which picture
// is showing (the older slideshows): open it by setting an index, close it
// by setting null.
export interface LightboxProps {
  images?: (string | null | undefined)[];
  index: number | null;
  alt?: string;
  onChange: (index: number) => void;
  onClose: () => void;
}

export function Lightbox({
  images,
  index,
  alt,
  onChange,
  onClose,
}: LightboxProps) {
  const list = useMemo(
    () => (images || []).filter((src): src is string => Boolean(src)),
    [images]
  );
  if (index === null || list.length === 0) {
    return null;
  }
  return (
    <LightboxModal
      alt={alt}
      images={list}
      index={Math.min(index, list.length - 1)}
      onChange={onChange}
      onClose={onClose}
    />
  );
}

interface LightboxModalProps {
  images: string[];
  index: number;
  alt?: string;
  onChange: (index: number) => void;
  onClose: () => void;
}

function LightboxModal({
  images,
  index,
  alt,
  onChange,
  onClose,
}: LightboxModalProps) {
  const [tc] = useTranslation('common');
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<number | null>(null);
  const count = images.length;
  const many = count > 1;

  const go = useCallback(
    (step: number) => onChange((index + step + count) % count),
    [index, count, onChange]
  );

  // Keys, scroll lock and focus: Escape closes, the arrows leaf; the page
  // under the modal stays put; focus goes to the cross and back after.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight' && many) {
        go(1);
      } else if (event.key === 'ArrowLeft' && many) {
        go(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [go, many, onClose]);

  // Load the neighbours ahead, so leafing is instant
  useEffect(() => {
    if (!many) {
      return;
    }
    [1, -1].forEach((step) => {
      const src = images[(index + step + count) % count];
      const img = new Image();
      img.src = getImageUrlBest(src) || src;
    });
  }, [index, images, count, many]);

  const src = images[index];
  const large = getImageUrlBest(src) || getImageUrl(src, 'medium') || src;

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || tc('lightbox.label')}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onPointerDown={(event) => {
        swipeStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (start === null || !many) {
          return;
        }
        const dx = event.clientX - start;
        if (Math.abs(dx) > 50) {
          go(dx < 0 ? 1 : -1);
        }
      }}
    >
      <img
        key={src}
        className="lightbox-image"
        alt={alt ? `${alt} (${index + 1}/${count})` : ''}
        src={large}
        draggable={false}
      />

      <button
        ref={closeRef}
        type="button"
        className="lightbox-button lightbox-close"
        aria-label={tc('lightbox.close')}
        onClick={onClose}
      >
        <XIcon width={18} height={18} />
      </button>

      {many && (
        <>
          <button
            type="button"
            className="lightbox-button lightbox-prev"
            aria-label={tc('lightbox.previous')}
            onClick={() => go(-1)}
          >
            <ChevronLeftIcon width={20} height={20} />
          </button>
          <button
            type="button"
            className="lightbox-button lightbox-next"
            aria-label={tc('lightbox.next')}
            onClick={() => go(1)}
          >
            <ChevronRightIcon width={20} height={20} />
          </button>
          <span className="lightbox-counter" aria-live="polite">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>,
    document.body
  );
}

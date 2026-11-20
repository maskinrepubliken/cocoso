import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import { useAtomValue } from 'jotai';

import { isMenuItemShown } from '/imports/api/_utils/features';
import { canCreateContentAtom, roleAtom } from '/imports/state';
import { sectionsOf } from '/imports/api/_utils/paths';

import { getCurrentSection } from './Header';

export type NewButtonAnimState = 'idle' | 'intro' | 'subtle';

// The intro (ring draw and spring) plays once per session; later section
// changes get the short bloom.
let introShown = false;
const INTRO_MS = 2800;
const SUBTLE_MS = 900;

export interface NewButtonProps {
  site: any;
}

// The plus in the header, on its right side. Shown only to those who may
// create content, and only on a listing where they can: it opens that
// listing's form.
export default function NewButton({ site }: NewButtonProps) {
  const [tc] = useTranslation('common');
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const role = useAtomValue(roleAtom);
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();

  const isAdmin = role === 'admin';
  const section = getCurrentSection(location.pathname);

  // The sections one can create in, as the menu lists them. Info pages are
  // the admins' to add; organizers add events and places too.
  const creatable = (site?.settings?.menu || [])
    .filter((item: any) => isMenuItemShown(item) && !item.isComposablePage)
    .filter((item: any) => item.name !== 'people')
    .filter((item: any) => isAdmin || item.name !== 'info');
  const current = creatable.find((item: any) => item.name === section);
  // On the listing itself, not on a page inside it (an event, a place)
  const rest = sectionsOf(location.pathname);
  const isListing =
    rest.length === 1 || (rest[0] === 'cp' && rest.length === 2);
  // A place's page too: a new place there is part of it
  const isPlacePage = rest[0] === 'resources' && rest.length === 2;
  const isVisible =
    Boolean(site) &&
    canCreateContent &&
    Boolean(current) &&
    (isListing || isPlacePage);

  const [animState, setAnimState] = useState<NewButtonAnimState>('idle');

  // Intro when the button first appears, bloom when the section changes:
  // decided while rendering, so the first frame already animates.
  const [seenSection, setSeenSection] = useState<string | null>(null);
  const sectionKey = isVisible ? section : null;
  if (sectionKey !== seenSection) {
    setSeenSection(sectionKey);
    if (isVisible) {
      setAnimState(introShown ? 'subtle' : 'intro');
    }
  }

  useEffect(() => {
    if (animState === 'idle') {
      return undefined;
    }
    introShown = true;
    const timer = setTimeout(
      () => setAnimState('idle'),
      animState === 'intro' ? INTRO_MS : SUBTLE_MS
    );
    return () => clearTimeout(timer);
  }, [animState]);

  if (!isVisible) {
    return null;
  }

  const label = tc(`labels.create.${current.name}`);

  const ring = (
    <svg
      className="new-button-ring"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        className="new-button-ring-path"
        cx="50"
        cy="50"
        r="48"
        pathLength={100}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );

  return (
    <div className={`new-button-wrapper new-button-${animState}`}>
      {ring}
      <button
        type="button"
        className="site-new-button"
        aria-label={label}
        title={label}
        onClick={() =>
          setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.set('new', 'true');
            return next;
          })
        }
      >
        <span className="site-new site-plus" aria-hidden>
          <PlusIcon width={16} height={16} />
        </span>
      </button>
    </div>
  );
}

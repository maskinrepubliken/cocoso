import { Meteor } from 'meteor/meteor';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import SearchIcon from 'lucide-react/dist/esm/icons/search';
import XIcon from 'lucide-react/dist/esm/icons/x';

import { parseTitle } from '/imports/api/_utils/shared';
import { entryPathWithin } from '/imports/ui/listing/useOpenEntry';
import {
  useCurrentLocation,
  useLocationPrefix,
} from '/imports/ui/utils/useLocation';

const isClient = Meteor?.isClient;
const DEBOUNCE_MS = 220;
const MIN_LENGTH = 2;

export interface SearchHit {
  kind:
    | 'activities'
    | 'groups'
    | 'resources'
    | 'works'
    | 'info'
    | 'people'
    | 'locations';
  _id: string;
  title: string;
  detail?: string;
  date?: string | null;
  // Events only: false once every occurrence has passed.
  isUpcoming?: boolean;
  isGroupMeeting?: boolean;
  groupId?: string;
  authorUsername?: string;
  username?: string;
  avatar?: string | null;
  slug?: string;
}

// The headings in the results; past events get one of their own.
type GroupKey = SearchHit['kind'] | 'pastActivities';

const GROUP_ORDER: GroupKey[] = [
  'activities',
  'pastActivities',
  'groups',
  'resources',
  'works',
  'info',
  'people',
  'locations',
];

// Where a hit leads: the same places the listings' cards go.
export const hitPath = (hit: SearchHit, prefix: string): string => {
  if (hit.kind === 'info') {
    return `${prefix}/info/${parseTitle(hit.title)}`;
  }
  if (hit.kind === 'people') {
    return `/@${hit.username}`;
  }
  if (hit.kind === 'locations') {
    return `/${hit.slug}`;
  }
  return entryPathWithin(prefix, hit, hit.kind);
};

// The section's label as the menu has it, so the groups read "Föreningar"
// in the results when they do in the header.
export const kindLabel = (site: any, kind: string, fallback: string) =>
  site?.settings?.menu?.find((item: any) => item.name === kind)?.label ||
  fallback;

export const formatDate = (date?: string | null, lang?: string) => {
  if (!date) {
    return '';
  }
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString(lang || 'sv', {
      day: 'numeric',
      month: 'short',
    });
  } catch (_error) {
    return date;
  }
};

// Only the sections the menu shows: one an admin has hidden from the menu
// is not found either (past events go with events; places are always on).
export const visibleHits = (hits: SearchHit[], site: any) =>
  hits.filter(
    (hit) =>
      site?.settings?.menu?.find((item: any) => item.name === hit.kind)
        ?.isVisible !== false
  );

// Where all the results for a query are listed
export const searchPath = (query: string, prefix: string) =>
  `${prefix}/search?q=${encodeURIComponent(query.trim())}`;

export const isPastEvent = (hit: SearchHit) =>
  hit.kind === 'activities' && hit.isUpcoming === false;

// The hits under their headings, in the order the sections are shown
export const groupHits = (
  hits: SearchHit[],
  site: any,
  tc: (key: string) => string
) =>
  GROUP_ORDER.map((key) => ({
    key,
    label:
      key === 'pastActivities'
        ? tc('search.kinds.pastActivities')
        : kindLabel(site, key, tc(`search.kinds.${key}`)),
    hits: hits.filter(
      (hit) => (isPastEvent(hit) ? 'pastActivities' : hit.kind) === key
    ),
  })).filter((group) => group.hits.length > 0);

// A hit's picture (for a person), title, "Avslutat" for a past event, and
// its line of detail: as the header lists it and the results page.
export function HitContent({ hit }: { hit: SearchHit }) {
  const [tc, i18n] = useTranslation('common');
  const isPast = isPastEvent(hit);
  return (
    <>
      {hit.kind === 'people' && (
        <span className="site-search-avatar" aria-hidden>
          {hit.avatar ? <img alt="" src={hit.avatar} /> : hit.title.charAt(0)}
        </span>
      )}
      <span className="site-search-hit-text">
        <span className="site-search-hit-title">
          {hit.title}
          {isPast && (
            <span className="site-search-badge">{tc('search.past')}</span>
          )}
        </span>
        {(hit.detail || hit.date) && (
          <span className="site-search-hit-detail">
            {hit.kind === 'activities' && hit.date
              ? [formatDate(hit.date, i18n.language), hit.detail]
                  .filter(Boolean)
                  .join(' · ')
              : hit.detail}
          </span>
        )}
      </span>
    </>
  );
}

export interface SiteSearchProps {
  site: any;
}

// The search box in the header, left of the account: a pill on desktop, a
// magnifier that opens a full-width field on a phone. Results arrive as
// you type and are grouped by section; arrow keys move to one and Enter
// opens it, Enter alone shows all the results on a page of their own,
// Escape closes.
export default function SiteSearch({ site }: SiteSearchProps) {
  const [tc] = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = useLocationPrefix();
  const currentLocation = useCurrentLocation();

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestRequest = useRef(0);

  const trimmed = query.trim();
  const showPanel = isOpen && trimmed.length >= MIN_LENGTH;

  // Ask the server a moment after the last keystroke; ignore answers that
  // arrive out of order.
  useEffect(() => {
    if (!isClient) {
      return undefined;
    }
    if (trimmed.length < MIN_LENGTH) {
      setHits([]);
      setHasSearched(false);
      setIsSearching(false);
      return undefined;
    }
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await Meteor.callAsync(
          'searchSite',
          trimmed,
          currentLocation?._id
        );
        if (latestRequest.current === requestId) {
          setHits(visibleHits(result || [], site));
          setActiveIndex(-1);
          setHasSearched(true);
        }
      } catch (_error) {
        if (latestRequest.current === requestId) {
          setHits([]);
          setHasSearched(true);
        }
      } finally {
        if (latestRequest.current === requestId) {
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, currentLocation?._id]);

  // Close and clear when the page changes (back button included).
  const [seenPathname, setSeenPathname] = useState(location.pathname);
  if (seenPathname !== location.pathname) {
    setSeenPathname(location.pathname);
    setIsOpen(false);
    setQuery('');
  }

  // Close when clicking elsewhere.
  useEffect(() => {
    if (!isClient || !isOpen) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const open = () => {
    setIsOpen(true);
    // Let the field render before focusing it (it is hidden on phones).
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const close = () => {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const goTo = (hit: SearchHit) => {
    navigate(hitPath(hit, prefix));
    close();
  };

  const showAll = () => {
    navigate(searchPath(trimmed, prefix));
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Enter' && activeIndex < 0) {
      event.preventDefault();
      if (trimmed.length >= MIN_LENGTH) {
        showAll();
      }
      return;
    }
    if (!showPanel || hits.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % hits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? hits.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      goTo(hits[activeIndex]);
    }
  };

  const groups = groupHits(hits, site, tc);

  const listId = 'site-search-results';

  return (
    <div
      className={`site-search ${isOpen ? 'is-open' : ''}`}
      ref={rootRef}
      role="search"
    >
      <button
        type="button"
        className="site-search-toggle"
        aria-label={tc('search.open')}
        onClick={() => (isOpen ? close() : open())}
      >
        {isOpen ? (
          <XIcon width={16} height={16} />
        ) : (
          <SearchIcon width={16} height={16} />
        )}
      </button>

      <div className="site-search-field">
        <SearchIcon className="site-search-icon" width={16} height={16} />
        <input
          ref={inputRef}
          type="search"
          className="site-search-input"
          placeholder={tc('search.placeholder')}
          aria-label={tc('search.placeholder')}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="site-search-clear"
            aria-label={tc('search.clear')}
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <XIcon width={14} height={14} />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="site-search-panel" id={listId} role="listbox">
          {groups.length === 0 ? (
            <div className="site-search-empty">
              {isSearching || !hasSearched
                ? tc('search.searching')
                : tc('search.noResults', { query: trimmed })}
            </div>
          ) : (
            groups.map((group) => (
              <div className="site-search-group" key={group.key}>
                <div className="site-search-group-label">{group.label}</div>
                {group.hits.map((hit) => {
                  const index = hits.indexOf(hit);
                  const isPast = isPastEvent(hit);
                  return (
                    <Link
                      key={`${hit.kind}-${hit._id}`}
                      id={`${listId}-${index}`}
                      className={`site-search-hit ${
                        index === activeIndex ? 'is-active' : ''
                      } ${isPast ? 'is-past' : ''}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      to={hitPath(hit, prefix)}
                      onClick={() => close()}
                    >
                      <HitContent hit={hit} />
                    </Link>
                  );
                })}
              </div>
            ))
          )}
          {hasSearched && hits.length > 0 && (
            <Link
              className="site-search-all"
              to={searchPath(trimmed, prefix)}
              onClick={() => close()}
            >
              {tc('search.showAll')}
              <kbd aria-hidden>↵</kbd>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

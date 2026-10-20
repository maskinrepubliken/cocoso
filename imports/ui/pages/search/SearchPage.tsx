import { Meteor } from 'meteor/meteor';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import SearchIcon from 'lucide-react/dist/esm/icons/search';

import { locationsAtom, siteAtom } from '/imports/state';
import PageHeading from '/imports/ui/listing/PageHeading';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import NewGridThumb from '/imports/ui/listing/NewGridThumb';
import GroupCard from '/imports/ui/listing/GroupCard';
import { People, PersonTile } from '/imports/ui/listing/UsersHybrid';
import ThreeDIcon, { sectionIcons } from '/imports/ui/generic/ThreeDIcon';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { worldForLocation } from '/imports/ui/utils/locationPalette';
import {
  HitContent,
  type SearchHit,
  groupHits,
  hitPath,
  kindLabel,
  visibleHits,
} from '/imports/ui/layout/SiteSearch';
import {
  useCurrentLocation,
  useLocationPrefix,
} from '/imports/ui/utils/useLocation';

const MIN_LENGTH = 2;
const PER_KIND = 30;
// A section shows this many until it is opened in full
const FIRST = 8;

// Everything the search finds for ?q=, grouped by section as in the
// header's results but with more of each, and a field to search again.
// Inside a place it searches that place, as the header does.
export default function SearchPage({ siteDoc }: { siteDoc?: any }) {
  const [tc] = useTranslation('common');
  const site = useAtomValue(siteAtom) || siteDoc;
  const locations = useAtomValue(locationsAtom);
  const prefix = useLocationPrefix();
  const currentLocation = useCurrentLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();

  const [draft, setDraft] = useState(query);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const latest = useRef(0);

  // The field follows the address (back and forward included)
  const [seenQuery, setSeenQuery] = useState(query);
  if (seenQuery !== query) {
    setSeenQuery(query);
    setDraft(query);
  }

  useEffect(() => {
    if (query.length < MIN_LENGTH) {
      setHits([]);
      return;
    }
    const request = latest.current + 1;
    latest.current = request;
    setHits(null);
    Meteor.callAsync('searchSite', query, currentLocation?._id, PER_KIND)
      .then((result: SearchHit[]) => {
        if (latest.current === request) {
          setHits(visibleHits(result || [], site));
        }
      })
      .catch(() => {
        if (latest.current === request) {
          setHits([]);
        }
      });
  }, [query, currentLocation?._id]);

  // Upcoming and past events share one section with a switch between
  // them (Tidigare | Kommande, as on the events page): upcoming chosen, as one rarely looks for what has been
  const allGroups = groupHits(hits || [], site, tc);
  const upcomingHits =
    allGroups.find((group) => group.key === 'activities')?.hits || [];
  const pastHits =
    allGroups.find((group) => group.key === 'pastActivities')?.hits || [];
  const [pastChoice, setPastChoice] = useState<boolean | null>(null);
  const [pastChoiceFor, setPastChoiceFor] = useState(query);
  if (pastChoiceFor !== query) {
    setPastChoiceFor(query);
    setPastChoice(null);
  }
  // Until chosen: the past only when nothing is coming up
  const showPast = pastChoice ?? upcomingHits.length === 0;
  const groups = allGroups
    .filter((group) => group.key !== 'pastActivities')
    .map((group) =>
      group.key === 'activities'
        ? { ...group, hits: showPast ? pastHits : upcomingHits }
        : group
    );
  if (pastHits.length > 0 && upcomingHits.length === 0) {
    groups.unshift({
      key: 'activities',
      label: kindLabel(site, 'activities', tc('search.kinds.activities')),
      hits: pastHits,
    });
  }

  // Sections opened in full; a new search closes them again
  const [opened, setOpened] = useState<string[]>([]);
  const [openedFor, setOpenedFor] = useState(query);
  if (openedFor !== query) {
    setOpenedFor(query);
    setOpened([]);
  }

  // Each kind in the cards its own listing uses: events with picture and
  // date, places and groups as on their pages, organizers as portraits;
  // the rest as rows.
  const renderGroup = (key: string, list: SearchHit[]) => {
    if (key === 'activities') {
      return (
        <div className="card-grid card-grid-wide">
          {list.map((hit, index) => (
            <Link
              key={hit._id}
              className="search-card"
              to={hitPath(hit, prefix)}
            >
              <SexyThumb
                activity={hit as any}
                index={index}
                showPast={showPast}
              />
            </Link>
          ))}
        </div>
      );
    }
    if (key === 'resources') {
      return (
        <div className="card-grid">
          {list.map((hit: any, index) => (
            <Link
              key={hit._id}
              className="search-card"
              to={hitPath(hit, prefix)}
            >
              <NewGridThumb
                fixedImageHeight
                imageUrl={getImageUrl(hit.images?.[0], 'small')}
                index={index}
                placeholderSeed={hit._id}
                placeName={
                  locations.find((l: any) => l._id === hit.locationId)?.name
                }
                title={hit.title}
                world={worldForLocation(locations, hit.locationId)}
              />
            </Link>
          ))}
        </div>
      );
    }
    if (key === 'groups') {
      return (
        <div className="card-grid">
          {list.map((hit: any, index) => (
            <Link
              key={hit._id}
              className="search-card"
              to={hitPath(hit, prefix)}
            >
              <GroupCard group={hit} index={index} />
            </Link>
          ))}
        </div>
      );
    }
    if (key === 'people') {
      return (
        <People className="search-people">
          {list.map((hit: any) => (
            <PersonTile key={hit._id} user={{ ...hit, firstName: hit.title }} />
          ))}
        </People>
      );
    }
    return (
      <div className="search-page-hits">
        {list.map((hit) => (
          <Link
            key={`${hit.kind}-${hit._id}`}
            className="site-search-hit search-page-hit"
            to={hitPath(hit, prefix)}
          >
            <HitContent hit={hit} />
          </Link>
        ))}
      </div>
    );
  };

  let status: string;
  if (query.length < MIN_LENGTH) {
    status = tc('search.page.tooShort');
  } else if (hits === null) {
    status = tc('search.searching');
  } else if (hits.length === 0) {
    status = tc('search.noResults', { query });
  } else {
    status = tc('search.page.count', { count: hits.length, query });
  }

  return (
    <div className="search-page">
      <PageHeading
        hideDescription
        listing="search"
        site={site}
        title={tc('search.page.title')}
      />

      <form
        className="search-page-form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchParams({ q: draft.trim() });
        }}
      >
        <SearchIcon aria-hidden width={18} height={18} />
        <input
          aria-label={tc('search.placeholder')}
          enterKeyHint="search"
          placeholder={tc('search.placeholder')}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">{tc('search.open')}</button>
      </form>

      <p aria-live="polite" className="search-page-status">
        {status}
      </p>

      {groups.map((group) => (
        <section className={`search-section is-${group.key}`} key={group.key}>
          {/* The section as its page heads itself: its 3D icon and name */}
          <h2 className="search-section-head">
            <ThreeDIcon
              name={
                group.key === 'locations'
                  ? 'location'
                  : sectionIcons[group.key] || 'star'
              }
              size={40}
            />
            {group.label}
            {/* the events' counts are in their switch */}
            {group.key !== 'activities' && (
              <span className="search-page-group-count">
                {group.hits.length}
              </span>
            )}
            {group.key === 'activities' && (
              <span className="seg search-section-seg" role="group">
                <button
                  type="button"
                  className={`seg-button ${showPast ? 'is-active' : ''}`}
                  aria-pressed={showPast}
                  onClick={() => setPastChoice(true)}
                >
                  {tc('labels.past')}
                  <span className="search-seg-count">{pastHits.length}</span>
                </button>
                <button
                  type="button"
                  className={`seg-button ${showPast ? '' : 'is-active'}`}
                  aria-pressed={!showPast}
                  onClick={() => setPastChoice(false)}
                >
                  {tc('labels.upcoming')}
                  <span className="search-seg-count">
                    {upcomingHits.length}
                  </span>
                </button>
              </span>
            )}
          </h2>
          {renderGroup(
            group.key,
            opened.includes(group.key) ? group.hits : group.hits.slice(0, FIRST)
          )}
          {group.hits.length > FIRST && !opened.includes(group.key) && (
            <button
              type="button"
              className="person-add search-section-more"
              onClick={() => setOpened([...opened, group.key])}
            >
              {tc('search.page.showAll', { count: group.hits.length })}
            </button>
          )}
        </section>
      ))}
    </div>
  );
}

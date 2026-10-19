import { Meteor } from 'meteor/meteor';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import SearchIcon from 'lucide-react/dist/esm/icons/search';

import { siteAtom } from '/imports/state';
import PageHeading from '/imports/ui/listing/PageHeading';
import {
  HitContent,
  type SearchHit,
  groupHits,
  hitPath,
  isPastEvent,
} from '/imports/ui/layout/SiteSearch';
import {
  useCurrentLocation,
  useLocationPrefix,
} from '/imports/ui/utils/useLocation';

const MIN_LENGTH = 2;
const PER_KIND = 30;

// Everything the search finds for ?q=, grouped by section as in the
// header's results but with more of each, and a field to search again.
// Inside a place it searches that place, as the header does.
export default function SearchPage({ siteDoc }: { siteDoc?: any }) {
  const [tc] = useTranslation('common');
  const site = useAtomValue(siteAtom) || siteDoc;
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
          setHits(result || []);
        }
      })
      .catch(() => {
        if (latest.current === request) {
          setHits([]);
        }
      });
  }, [query, currentLocation?._id]);

  const groups = groupHits(hits || [], site, tc);

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
        <section className="search-page-group" key={group.key}>
          <h2 className="search-page-group-label">
            {group.label}
            <span className="search-page-group-count">{group.hits.length}</span>
          </h2>
          <div className="search-page-hits">
            {group.hits.map((hit) => (
              <Link
                key={`${hit.kind}-${hit._id}`}
                className={`site-search-hit search-page-hit ${
                  isPastEvent(hit) ? 'is-past' : ''
                }`}
                to={hitPath(hit, prefix)}
              >
                <HitContent hit={hit} />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

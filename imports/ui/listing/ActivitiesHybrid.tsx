import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAtomValue } from 'jotai';

import { useTranslation } from 'react-i18next';

import InfiniteScroller from './InfiniteScroller';
import PageHeading, { PlaceNotice } from './PageHeading';
import useOpenEntry from './useOpenEntry';
import SexyThumb from './SexyThumb';
import ThreeDIcon from '../generic/ThreeDIcon';
import { locationsAtom } from '/imports/state';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';
import { EVENT_KINDS } from '../pages/activities/eventKinds';
import EventViewMenu, {
  type EventView,
  type EventWhen,
  happensWithin,
} from './EventViewMenu';

export interface ActivitiesHybridProps {
  siteDoc: any;
  activities: any[];
  showPast?: boolean;
}

export default function ActivitiesHybrid({
  siteDoc,
  activities,
  showPast,
}: ActivitiesHybridProps) {
  const site = { ...siteDoc };
  const [tc] = useTranslation('common');
  const openEntry = useOpenEntry('activities');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const locations = useAtomValue(locationsAtom);
  const currentLocation = useCurrentLocation();

  const listParam = (name: string) =>
    (searchParams.get(name) || '').split(',').filter(Boolean);
  const setParams = (change: Record<string, string | null>) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      Object.entries(change).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      return next;
    });

  // The chosen kinds: one from the strip, any number from the filter menu
  const kinds = listParam('kind');
  const oneKind = kinds.length === 1 ? kinds[0] : '';
  const setKinds = (keys: string[]) => setParams({ kind: keys.join(',') });
  const toggleKind = (key: string) =>
    setKinds(
      kinds.includes(key) ? kinds.filter((k) => k !== key) : [...kinds, key]
    );

  // The chosen places (orter). Inside a place it is that one, and the list
  // only holds its events; choosing more goes to the whole municipality
  // with all of them chosen.
  const placeSlugs = currentLocation
    ? [currentLocation.slug]
    : listParam('ort');
  const togglePlace = (slug: string) => {
    const next = placeSlugs.includes(slug)
      ? placeSlugs.filter((s) => s !== slug)
      : [...placeSlugs, slug];
    if (!currentLocation) {
      setParams({ ort: next.join(',') });
      return;
    }
    const params = new URLSearchParams(searchParams);
    if (next.length) params.set('ort', next.join(','));
    else params.delete('ort');
    const query = params.toString();
    navigate(`/activities${query ? `?${query}` : ''}`);
  };
  const placeIds = new Set(
    locations
      .filter((location: any) => placeSlugs.includes(location.slug))
      .map((location: any) => location._id)
  );

  // Only kinds that some upcoming event has, so no chip is a dead end.
  const presentKinds = useMemo(() => {
    const keys = new Set(
      activities.map((a: any) => a.category?.key).filter(Boolean)
    );
    return EVENT_KINDS.filter((kind) => keys.has(kind.key));
  }, [activities]);

  // Past or upcoming, a stretch of days and only those with sign-up, from
  // the filter menu; all in the address, as the kinds and places.
  const when = (searchParams.get('when') || '') as EventWhen;
  const view: EventView = {
    showPast: Boolean(showPast),
    when: showPast ? '' : when,
    rsvp: searchParams.get('rsvp') === '1',
  };
  const setView = (change: Partial<EventView>) =>
    setParams({
      ...(change.showPast !== undefined
        ? { showPast: change.showPast ? 'true' : 'false' }
        : {}),
      ...(change.when !== undefined ? { when: change.when || null } : {}),
      ...(change.rsvp !== undefined ? { rsvp: change.rsvp ? '1' : null } : {}),
    });

  const groupsInMenu = site?.settings?.menu?.find(
    (item: any) => item.name === 'groups'
  );

  const groupsLabel = groupsInMenu?.label;

  // Every event as a card, weekly ones too; the start page has the day and
  // week overviews. Chosen places keep the events for the whole
  // municipality too, as a place's own page does.
  const kindsKey = kinds.join(',');
  const placesKey = [...placeIds].join(',');
  const cardActivities = useMemo(
    () =>
      activities.filter(
        (activity: any) =>
          (!kinds.length || kinds.includes(activity.category?.key)) &&
          (currentLocation ||
            !placeIds.size ||
            placeIds.has(activity.locationId) ||
            (!activity.locationId && !activity.isMunicipalityOnly)) &&
          happensWithin(activity, view.when) &&
          (!view.rsvp || activity.isRegistrationEnabled)
      ),
    [activities, kindsKey, placesKey, view.when, view.rsvp]
  );

  const resetAll = () =>
    setParams({ kind: null, ort: null, when: null, rsvp: null });

  return (
    <>
      <PageHeading
        site={site || siteDoc}
        listing="activities"
        hideDescription
        hidePlace
        title={oneKind ? tc(`eventKinds.headings.${oneKind}`) : undefined}
        subject={oneKind ? tc(`eventKinds.subjects.${oneKind}`) : undefined}
      />

      {/* The kinds as a strip of icons with small labels, the chosen ones
          underlined in green; nothing boxed, so it is not another pill.
          A tap picks that one kind; the filter menu, at the right end and
          outside the strip (which scrolls sideways on a phone), picks
          several, and places, days and sign-up. */}
      <div className="kind-bar page-wrap">
        <div className="kind-strip">
          {presentKinds.length > 1 && (
            <>
              <button
                type="button"
                className={`kind-tile ${kinds.length ? '' : 'is-active'}`}
                aria-pressed={!kinds.length}
                onClick={() => setKinds([])}
              >
                <ThreeDIcon name="star" size={36} />
                <span>{tc('eventKinds.all')}</span>
              </button>
              {presentKinds.map((kind) => (
                <button
                  key={kind.key}
                  type="button"
                  aria-pressed={kinds.includes(kind.key)}
                  className={`kind-tile ${
                    kinds.includes(kind.key) ? 'is-active' : ''
                  }`}
                  onClick={() =>
                    setKinds(oneKind === kind.key ? [] : [kind.key])
                  }
                >
                  <ThreeDIcon name={kind.icon} size={36} />
                  <span>{tc(`eventKinds.${kind.key}`)}</span>
                </button>
              ))}
            </>
          )}
        </div>
        <EventViewMenu
          isNarrowed={
            Boolean(view.when) ||
            view.rsvp ||
            kinds.length > 1 ||
            (!currentLocation && placeSlugs.length > 0)
          }
          kinds={presentKinds}
          locations={locations}
          places={placeSlugs}
          selectedKinds={kinds}
          view={view}
          onChange={setView}
          onToggleKind={toggleKind}
          onTogglePlace={togglePlace}
        />
      </div>

      {/* Under the kinds: inside a place, the line saying so */}
      <div className="page-wrap place-notice-row">
        <PlaceNotice
          listing="activities"
          subject={oneKind ? tc(`eventKinds.subjects.${oneKind}`) : undefined}
        />
      </div>

      {/* Narrowed to nothing: say so, and how to widen it again */}
      {cardActivities.length === 0 && activities.length > 0 && (
        <p className="view-empty page-wrap">
          {tc('eventView.empty')}{' '}
          <button type="button" onClick={resetAll}>
            {tc('eventView.reset')}
          </button>
        </p>
      )}

      <InfiniteScroller gridWide isGrid items={cardActivities}>
        {(item, index) => (
          <div
            key={item._id}
            style={{ cursor: 'pointer' }}
            onClick={() => openEntry(item)}
          >
            <SexyThumb
              activity={item}
              index={index}
              showPast={showPast}
              tags={
                [item.isGroupMeeting ? groupsLabel : null].filter(
                  Boolean
                ) as string[]
              }
            />
          </div>
        )}
      </InfiniteScroller>
    </>
  );
}

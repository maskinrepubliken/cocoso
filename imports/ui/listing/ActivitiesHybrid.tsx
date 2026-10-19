import React, { useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import InfiniteScroller from './InfiniteScroller';
import PageHeading, { PlaceNotice } from './PageHeading';
import useOpenEntry from './useOpenEntry';
import SexyThumb from './SexyThumb';
import ThreeDIcon from '../generic/ThreeDIcon';
import { EVENT_KINDS } from '../pages/activities/eventKinds';
import EventViewMenu, { happensWithin } from './EventViewMenu';
import useEventFilters from './useEventFilters';

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
  const {
    locations,
    kinds,
    oneKind,
    setKinds,
    toggleKind,
    placeSlugs,
    togglePlace,
    filterKey,
    matches,
    view,
    setView,
    isNarrowed,
    resetAll,
  } = useEventFilters('activities');

  // Only kinds that some upcoming event has, so no chip is a dead end.
  const presentKinds = useMemo(() => {
    const keys = new Set(
      activities.map((a: any) => a.category?.key).filter(Boolean)
    );
    return EVENT_KINDS.filter((kind) => keys.has(kind.key));
  }, [activities]);

  const groupsInMenu = site?.settings?.menu?.find(
    (item: any) => item.name === 'groups'
  );

  const groupsLabel = groupsInMenu?.label;

  // Every event as a card, weekly ones too; the start page has the day and
  // week overviews. Chosen places keep the events for the whole
  // municipality too, as a place's own page does.
  const cardActivities = useMemo(
    () =>
      activities.filter(
        (activity: any) =>
          matches(activity) && happensWithin(activity, view.when)
      ),
    [activities, filterKey]
  );

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
          several, and places and days. */}
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
          isNarrowed={isNarrowed}
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

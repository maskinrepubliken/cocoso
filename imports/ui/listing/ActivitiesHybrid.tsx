import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { useTranslation } from 'react-i18next';

import InfiniteScroller from './InfiniteScroller';
import PageHeading, { PlaceNotice } from './PageHeading';
import useOpenEntry from './useOpenEntry';
import SexyThumb from './SexyThumb';
import ThreeDIcon from '../generic/ThreeDIcon';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const kindFilter = searchParams.get('kind') || '';
  const setKind = (key: string) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (key) next.set('kind', key);
      else next.delete('kind');
      return next;
    });
  // Only kinds that some upcoming event has, so no chip is a dead end.
  const presentKinds = useMemo(() => {
    const keys = new Set(
      activities.map((a: any) => a.category?.key).filter(Boolean)
    );
    return EVENT_KINDS.filter((kind) => keys.has(kind.key));
  }, [activities]);

  // Upcoming or past, a stretch of days and only those with sign-up,
  // from the menu at the end of the kinds; all in the address, keeping
  // the chosen kind.
  const when = (searchParams.get('when') || '') as EventWhen;
  const view: EventView = {
    showPast: Boolean(showPast),
    when: showPast ? '' : when,
    rsvp: searchParams.get('rsvp') === '1',
  };
  const setView = (change: Partial<EventView>) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (change.showPast !== undefined) {
        next.set('showPast', change.showPast ? 'true' : 'false');
      }
      if (change.when !== undefined) {
        if (change.when) next.set('when', change.when);
        else next.delete('when');
      }
      if (change.rsvp !== undefined) {
        if (change.rsvp) next.set('rsvp', '1');
        else next.delete('rsvp');
      }
      return next;
    });

  const groupsInMenu = site?.settings?.menu?.find(
    (item: any) => item.name === 'groups'
  );

  const groupsLabel = groupsInMenu?.label;

  // Every event as a card, weekly ones too; the start page has the day and
  // week overviews.
  const cardActivities = useMemo(
    () =>
      activities.filter(
        (activity: any) =>
          (!kindFilter || activity.category?.key === kindFilter) &&
          happensWithin(activity, view.when) &&
          (!view.rsvp || activity.isRegistrationEnabled)
      ),
    [activities, kindFilter, view.when, view.rsvp]
  );

  return (
    <>
      <PageHeading
        site={site || siteDoc}
        listing="activities"
        hideDescription
        hidePlace
        title={kindFilter ? tc(`eventKinds.headings.${kindFilter}`) : undefined}
        subject={
          kindFilter ? tc(`eventKinds.subjects.${kindFilter}`) : undefined
        }
      />

      {/* The kinds as a strip of icons with small labels, the chosen one
          underlined in green; nothing boxed, so it is not another pill.
          The view menu ends the row, a little apart and outside the
          strip, which scrolls sideways on a phone. */}
      <div className="kind-bar page-wrap">
        <div className="kind-strip">
          {presentKinds.length > 1 && (
            <>
              <button
                type="button"
                className={`kind-tile ${kindFilter ? '' : 'is-active'}`}
                aria-pressed={!kindFilter}
                onClick={() => setKind('')}
              >
                <ThreeDIcon name="star" size={36} />
                <span>{tc('eventKinds.all')}</span>
              </button>
              {presentKinds.map((kind) => (
                <button
                  key={kind.key}
                  type="button"
                  aria-pressed={kindFilter === kind.key}
                  className={`kind-tile ${
                    kindFilter === kind.key ? 'is-active' : ''
                  }`}
                  onClick={() =>
                    setKind(kindFilter === kind.key ? '' : kind.key)
                  }
                >
                  <ThreeDIcon name={kind.icon} size={36} />
                  <span>{tc(`eventKinds.${kind.key}`)}</span>
                </button>
              ))}
            </>
          )}
        </div>
        <EventViewMenu view={view} onChange={setView} />
      </div>

      {/* Under the kinds: inside a place, the line saying so */}
      <div className="page-wrap place-notice-row">
        <PlaceNotice
          listing="activities"
          subject={
            kindFilter ? tc(`eventKinds.subjects.${kindFilter}`) : undefined
          }
        />
      </div>

      {/* Narrowed to nothing: say so, and how to widen it again */}
      {cardActivities.length === 0 && activities.length > 0 && (
        <p className="view-empty page-wrap">
          {tc('eventView.empty')}{' '}
          <button
            type="button"
            onClick={() => {
              setKind('');
              setView({ when: '', rsvp: false });
            }}
          >
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

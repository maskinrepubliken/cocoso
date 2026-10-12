import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';

import InfiniteScroller from './InfiniteScroller';
import PageHeading from './PageHeading';
import useOpenEntry from './useOpenEntry';
import SexyThumb from './SexyThumb';
import ThreeDIcon from '../generic/ThreeDIcon';
import { EVENT_KINDS } from '../pages/activities/eventKinds';

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

  // Upcoming or past, keeping the chosen kind.
  const setShowPast = (value: boolean) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('showPast', value ? 'true' : 'false');
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
      kindFilter
        ? activities.filter(
            (activity: any) => activity.category?.key === kindFilter
          )
        : activities,
    [activities, kindFilter]
  );

  return (
    <>
      <PageHeading site={site || siteDoc} listing="activities" />

      {/* The toolbar: the kinds on the left, upcoming/past as a segmented
          switch on the right, like Idag/Imorgon on the start page */}
      <div className="events-toolbar page-wrap">
        {presentKinds.length > 1 ? (
          <div className="kind-chips">
            <button
              type="button"
              className={`kind-chip ${kindFilter ? '' : 'is-active'}`}
              onClick={() => setKind('')}
            >
              {tc('eventKinds.all')}
            </button>
            {presentKinds.map((kind) => (
              <button
                key={kind.key}
                type="button"
                aria-pressed={kindFilter === kind.key}
                className={`kind-chip ${
                  kindFilter === kind.key ? 'is-active' : ''
                }`}
                onClick={() => setKind(kindFilter === kind.key ? '' : kind.key)}
              >
                <ThreeDIcon name={kind.icon} size={30} />
                {tc(`eventKinds.${kind.key}`)}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}

        <div className="seg" role="group">
          <button
            type="button"
            className={`seg-button ${showPast ? '' : 'is-active'}`}
            aria-pressed={!showPast}
            onClick={() => setShowPast(false)}
          >
            <Trans i18nKey="common:labels.upcoming">Upcoming</Trans>
          </button>
          <button
            type="button"
            className={`seg-button ${showPast ? 'is-active' : ''}`}
            aria-pressed={Boolean(showPast)}
            onClick={() => setShowPast(true)}
          >
            <Trans i18nKey="common:labels.past">Past</Trans>
          </button>
        </div>
      </div>

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

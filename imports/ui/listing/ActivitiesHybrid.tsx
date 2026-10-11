import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Center } from '/imports/ui/core';
import { locationsAtom } from '/imports/state';
import { isRecurringActivity } from '/imports/api/activities/recurrence';

import InfiniteScroller from './InfiniteScroller';
import PageHeading from './PageHeading';
import useOpenEntry from './useOpenEntry';
import SexyThumb from './SexyThumb';
import { DayAgenda, WeeklySchedule } from './RecurringOverview';
import Tabs from '../core/Tabs';
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
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');
  const openEntry = useOpenEntry('activities');

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name ||
    (item.isMunicipalityOnly ? tc('locations.municipalityOnlyShort') : null);
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

  const tabs = [
    {
      key: 'past',
      title: <Trans i18nKey="common:labels.past">Past</Trans>,
      onClick: () => setSearchParams({ showPast: 'true' }),
    },
    {
      key: 'upcoming',
      title: <Trans i18nKey="common:labels.upcoming">Upcoming</Trans>,
      onClick: () => setSearchParams({ showPast: 'false' }),
    },
  ];

  const groupsInMenu = site?.settings?.menu?.find(
    (item) => item.name === 'groups'
  );

  const groupsLabel = groupsInMenu?.label;

  // Upcoming: what recurs weekly gets the day and week overviews, the cards
  // are for one-off events. Past keeps every activity as a card.
  const cardActivities = useMemo(() => {
    const byTab = showPast
      ? activities
      : activities.filter((activity) => !isRecurringActivity(activity));
    return kindFilter
      ? byTab.filter((activity: any) => activity.category?.key === kindFilter)
      : byTab;
  }, [activities, showPast, kindFilter]);

  return (
    <>
      {!showPast && (
        <Box className="page-wrap" pt="1">
          <DayAgenda activities={activities} placeOf={locationNameOf} />
          <WeeklySchedule activities={activities} placeOf={locationNameOf} />
        </Box>
      )}

      <PageHeading site={site || siteDoc} listing="activities" />

      <Center>
        <Tabs tabs={tabs} index={showPast ? 0 : 1} />
      </Center>

      {presentKinds.length > 1 && (
        <div className="kind-chips page-wrap">
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
              className={`kind-chip ${kindFilter === kind.key ? 'is-active' : ''}`}
              onClick={() => setKind(kindFilter === kind.key ? '' : kind.key)}
            >
              <ThreeDIcon name={kind.icon} size={30} />
              {tc(`eventKinds.${kind.key}`)}
            </button>
          ))}
        </div>
      )}

      <InfiniteScroller
        gridWide
        isGrid
        items={cardActivities}
        filtrerMarginTop={presentKinds.length > 1 ? 0 : -72}
      >
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

import React, { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Center, Modal } from '/imports/ui/core';
import { locationsAtom } from '/imports/state';

import InfiniteScroller from './InfiniteScroller';
import PageHeading from './PageHeading';
import PopupHandler from './PopupHandler';
import SexyThumb from './SexyThumb';
import Tabs from '../core/Tabs';
import ActivityQuickView from '../pages/activities/components/ActivityQuickView';

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
  const [modalItem, setModalItem] = useState<any>(null);

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name ||
    (item.isMunicipalityOnly ? tc('locations.municipalityOnlyShort') : null);
  const [, setSearchParams] = useSearchParams();

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

  return (
    <>
      <PageHeading site={site || siteDoc} listing="activities" />

      <Center>
        <Tabs tabs={tabs} index={showPast ? 0 : 1} />
      </Center>

      <InfiniteScroller items={activities} filtrerMarginTop={-72}>
        {(item, index) => (
          <Center
            key={item._id}
            flex="1 1 355px"
            onClick={() => setModalItem(item)}
          >
            <SexyThumb
              activity={item}
              index={index}
              showPast={showPast}
              tags={
                [
                  item.isGroupMeeting ? groupsLabel : null,
                  locationNameOf(item),
                ].filter(Boolean) as string[]
              }
            />
          </Center>
        )}
      </InfiniteScroller>

      {/* Events open the short version with sign-up; group meetings keep
          the general popup that leads to their group. */}
      {modalItem && !modalItem.isGroupMeeting && (
        <Modal
          hideFooter
          id="activity-quick-view"
          open
          size="lg"
          title={modalItem.title}
          onClose={() => setModalItem(null)}
        >
          <ActivityQuickView activityId={modalItem._id} />
        </Modal>
      )}

      <PopupHandler
        item={modalItem?.isGroupMeeting ? modalItem : null}
        kind="activities"
        showPast={showPast}
        onClose={() => setModalItem(null)}
      />
    </>
  );
}

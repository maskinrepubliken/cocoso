import React from 'react';
import { useAtomValue } from 'jotai';

import { siteAtom } from '/imports/state';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';

import InfiniteScroller from './InfiniteScroller';
import PageHeading from './PageHeading';
import useOpenEntry from './useOpenEntry';
import GroupCard from './GroupCard';

export interface GroupsHybridProps {
  siteDoc: any;
  groups: any[];
}

export default function GroupsHybrid({ siteDoc, groups }: GroupsHybridProps) {
  const site = useAtomValue(siteAtom);
  const openEntry = useOpenEntry('groups');
  const currentLocation = useCurrentLocation();

  return (
    <>
      <PageHeading site={site || siteDoc} listing="groups" />

      <InfiniteScroller isGrid items={groups}>
        {(item: any, index: number) => (
          <div key={item._id} onClick={() => openEntry(item)}>
            <GroupCard
              group={item}
              index={index}
              hideLocation={Boolean(currentLocation)}
            />
          </div>
        )}
      </InfiniteScroller>
    </>
  );
}

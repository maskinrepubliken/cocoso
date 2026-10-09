import React from 'react';
import { useAtomValue } from 'jotai';

import { siteAtom } from '/imports/state';

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

  return (
    <>
      <PageHeading site={site || siteDoc} listing="groups" />

      <InfiniteScroller isGrid items={groups} filtrerMarginTop={-76}>
        {(item, index) => (
          <div key={item._id} onClick={() => openEntry(item)}>
            <GroupCard group={item} index={index} />
          </div>
        )}
      </InfiniteScroller>
    </>
  );
}

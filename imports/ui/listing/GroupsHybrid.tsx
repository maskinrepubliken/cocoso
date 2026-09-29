import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { siteAtom, locationsAtom } from '/imports/state';
import { Center } from '/imports/ui/core';

import InfiniteScroller from './InfiniteScroller';
import PageHeading from './PageHeading';
import useOpenEntry from './useOpenEntry';
import SexyThumb from './SexyThumb';

export interface GroupsHybridProps {
  siteDoc: any;
  groups: any[];
}

export default function GroupsHybrid({ siteDoc, groups }: GroupsHybridProps) {
  const site = useAtomValue(siteAtom);
  const locations = useAtomValue(locationsAtom);
  const openEntry = useOpenEntry('groups');
  const [tc] = useTranslation('common');

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name ||
    (item.isMunicipalityOnly ? tc('locations.municipalityOnlyShort') : null);

  return (
    <>
      <PageHeading site={site || siteDoc} listing="groups" />

      <InfiniteScroller items={groups} filtrerMarginTop={-76}>
        {(item, index) => (
          <Center
            key={item._id}
            flex="1 1 355px"
            css={{ cursor: 'pointer' }}
            onClick={() => openEntry(item)}
          >
            <SexyThumb
              activity={item}
              index={index}
              tags={
                [
                  item.isPrivate ? tc('labels.private') : null,
                  locationNameOf(item),
                ].filter(Boolean) as string[]
              }
            />
          </Center>
        )}
      </InfiniteScroller>
    </>
  );
}

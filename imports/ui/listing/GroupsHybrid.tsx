import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { currentHostAtom, locationsAtom } from '/imports/state';
import { Center } from '/imports/ui/core';

import InfiniteScroller from './InfiniteScroller';
import PageHeading from './PageHeading';
import PopupHandler from './PopupHandler';
import SexyThumb from './SexyThumb';

export interface GroupsHybridProps {
  Host: any;
  groups: any[];
}

export default function GroupsHybrid({ Host, groups }: GroupsHybridProps) {
  const currentHost = useAtomValue(currentHostAtom);
  const locations = useAtomValue(locationsAtom);
  const [modalItem, setModalItem] = useState(null);
  const [tc] = useTranslation('common');

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name;

  return (
    <>
      <PageHeading currentHost={currentHost || Host} listing="groups" />

      <InfiniteScroller items={groups} filtrerMarginTop={-76}>
        {(item, index) => (
          <Center
            key={item._id}
            flex="1 1 355px"
            onClick={() => setModalItem(item)}
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

      <PopupHandler
        item={modalItem}
        kind="groups"
        onClose={() => setModalItem(null)}
      />
    </>
  );
}

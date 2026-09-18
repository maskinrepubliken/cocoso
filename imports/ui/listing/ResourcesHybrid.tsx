import React, { useState } from 'react';
import { useAtomValue } from 'jotai';

import { siteAtom, locationsAtom } from '/imports/state';
import { Box } from '/imports/ui/core';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

import PageHeading from './PageHeading';
import PopupHandler from './PopupHandler';
import InfiniteScroller from './InfiniteScroller';
import NewGridThumb from './NewGridThumb';

export interface ResourcesHybridProps {
  siteDoc: object;
  resources: object[];
}

export default function ResourcesHybrid({
  siteDoc,
  resources,
}: ResourcesHybridProps) {
  const site = useAtomValue(siteAtom);
  const locations = useAtomValue(locationsAtom);
  const [modalItem, setModalItem] = useState(null);

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name;

  return (
    <>
      <PageHeading site={site || siteDoc} listing="resources" />

      <Box px="2" pb="8">
        <InfiniteScroller isMasonry items={resources} filtrerMarginTop={-82}>
          {(resource, index) => (
            <Box
              key={resource._id}
              mb="2"
              css={{
                borderRadius: 'var(--cocoso-border-radius)',
                cursor: 'pointer',
              }}
              onClick={() => setModalItem(resource)}
            >
              <NewGridThumb
                fixedImageHeight
                imageUrl={getImageUrl(resource.images?.[0], 'small')}
                index={index}
                tag={locationNameOf(resource)}
                title={resource.label}
              />
            </Box>
          )}
        </InfiniteScroller>

        <PopupHandler
          item={modalItem}
          kind="resources"
          onClose={() => setModalItem(null)}
        />
      </Box>
    </>
  );
}

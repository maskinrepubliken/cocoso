import React from 'react';
import { useAtomValue } from 'jotai';

import { siteAtom, locationsAtom } from '/imports/state';
import { Box } from '/imports/ui/core';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { worldForLocation } from '/imports/ui/utils/locationPalette';

import PageHeading from './PageHeading';
import useOpenEntry from './useOpenEntry';
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
  const openEntry = useOpenEntry('resources');

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
              onClick={() => openEntry(resource)}
            >
              <NewGridThumb
                fixedImageHeight
                imageUrl={getImageUrl(resource.images?.[0], 'small')}
                index={index}
                placeholderSeed={resource._id}
                placeName={locationNameOf(resource)}
                title={resource.label}
                world={worldForLocation(locations, resource.locationId)}
              />
            </Box>
          )}
        </InfiniteScroller>
      </Box>
    </>
  );
}

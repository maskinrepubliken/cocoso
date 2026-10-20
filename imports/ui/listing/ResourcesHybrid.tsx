import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { siteAtom, locationsAtom } from '/imports/state';
import { Box } from '/imports/ui/core';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import { RESOURCE_KINDS } from '/imports/ui/pages/resources/resourceKinds';
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
  const [tc] = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name;

  // Only kinds that some place has, so no tile is a dead end.
  const presentKinds = useMemo(() => {
    const keys = new Set(
      resources.map((r: any) => r.category?.key).filter(Boolean)
    );
    return RESOURCE_KINDS.filter((kind) => keys.has(kind.key));
  }, [resources]);

  // The chosen kind, in the address (?kind=) like on the events page
  const kindParam = searchParams.get('kind') || '';
  const kind = presentKinds.some((k) => k.key === kindParam) ? kindParam : '';
  const pickKind = (key: string) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (key) next.set('kind', key);
      else next.delete('kind');
      return next;
    });

  const shownResources = useMemo(
    () =>
      kind
        ? resources.filter((r: any) => r.category?.key === kind)
        : resources,
    [resources, kind]
  );

  return (
    <>
      <PageHeading
        site={site || siteDoc}
        listing="resources"
        title={kind ? tc(`resourceKinds.headings.${kind}`) : undefined}
        subject={kind ? tc(`resourceKinds.subjects.${kind}`) : undefined}
      />

      {/* The kinds as on the events page: a tap picks that one kind */}
      {presentKinds.length > 1 && (
        <div className="kind-bar page-wrap">
          <div className="kind-strip">
            <button
              type="button"
              className={`kind-tile ${!kind ? 'is-active' : ''}`}
              aria-pressed={!kind}
              onClick={() => pickKind('')}
            >
              <ThreeDIcon name="star" size={36} />
              <span>{tc('resourceKinds.all')}</span>
            </button>
            {presentKinds.map((k) => (
              <button
                key={k.key}
                type="button"
                aria-pressed={kind === k.key}
                className={`kind-tile ${kind === k.key ? 'is-active' : ''}`}
                onClick={() => pickKind(kind === k.key ? '' : k.key)}
              >
                <ThreeDIcon name={k.icon} size={36} />
                <span>{tc(`resourceKinds.${k.key}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Box pb="8">
        <InfiniteScroller isGrid items={shownResources}>
          {(resource, index) => (
            <Box
              key={resource._id}
              css={{ cursor: 'pointer' }}
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

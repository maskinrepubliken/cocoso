import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';

import { siteAtom } from '/imports/state';
import { kindsOf } from '/imports/api/_utils/kinds';
import { Box } from '/imports/ui/core';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import { RESOURCE_KINDS } from '/imports/ui/pages/resources/resourceKinds';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { worldForLocation } from '/imports/ui/utils/locationPalette';

import PageHeading, { PlaceNotice } from './PageHeading';
import useOpenEntry from './useOpenEntry';
import InfiniteScroller from './InfiniteScroller';
import NewGridThumb from './NewGridThumb';
import EventViewMenu from './EventViewMenu';
import useEventFilters from './useEventFilters';

export interface ResourcesHybridProps {
  siteDoc: object;
  resources: object[];
}

export default function ResourcesHybrid({
  siteDoc,
  resources,
}: ResourcesHybridProps) {
  const site = useAtomValue(siteAtom);
  const openEntry = useOpenEntry('resources');
  const [tc] = useTranslation('common');
  // The same filters as on the events page, kinds and places (orter), in
  // the address; places have no dates, so no past/upcoming or days.
  const {
    locations,
    kinds,
    oneKind,
    toggleKind,
    placeSlugs,
    togglePlace,
    filterKey,
    matches,
    view,
    setView,
    isNarrowed,
    resetAll,
    pickFromStrip,
  } = useEventFilters('resources');

  const locationNameOf = (item: any) =>
    locations.find((l: any) => l._id === item.locationId)?.name;

  // Only kinds that some place has, so no tile is a dead end.
  const presentKinds = useMemo(() => {
    const keys = new Set(resources.flatMap((r: any) => kindsOf(r)));
    return RESOURCE_KINDS.filter((kind) => keys.has(kind.key));
  }, [resources]);

  const shownResources = useMemo(
    () => resources.filter((resource: any) => matches(resource)),
    [resources, filterKey]
  );

  return (
    <>
      <PageHeading
        site={site || siteDoc}
        listing="resources"
        hidePlace
        title={oneKind ? tc(`resourceKinds.headings.${oneKind}`) : undefined}
        subject={oneKind ? tc(`resourceKinds.subjects.${oneKind}`) : undefined}
      />

      {/* The kinds as on the events page: a tap picks that one kind; the
          Filter at the right end picks several, and places. "Alla", one
          kind and the Filter are one choice: only one is underlined. */}
      <div className="kind-bar page-wrap">
        <div className="kind-strip">
          {presentKinds.length > 1 && (
            <>
              <button
                type="button"
                className={`kind-tile ${
                  !kinds.length && !isNarrowed ? 'is-active' : ''
                }`}
                aria-pressed={!kinds.length && !isNarrowed}
                onClick={() => pickFromStrip('')}
              >
                <ThreeDIcon name="star" size={36} />
                <span>{tc('resourceKinds.all')}</span>
              </button>
              {presentKinds.map((kind) => (
                <button
                  key={kind.key}
                  type="button"
                  aria-pressed={!isNarrowed && oneKind === kind.key}
                  className={`kind-tile ${
                    !isNarrowed && oneKind === kind.key ? 'is-active' : ''
                  }`}
                  onClick={() =>
                    pickFromStrip(
                      !isNarrowed && oneKind === kind.key ? '' : kind.key
                    )
                  }
                >
                  <ThreeDIcon name={kind.icon} size={36} />
                  <span>{tc(`resourceKinds.${kind.key}`)}</span>
                </button>
              ))}
            </>
          )}
        </div>
        <EventViewMenu
          isNarrowed={isNarrowed}
          kindNamespace="resourceKinds"
          kinds={presentKinds}
          locations={locations}
          places={placeSlugs}
          selectedKinds={kinds}
          view={view}
          withTime={false}
          onChange={setView}
          onToggleKind={toggleKind}
          onTogglePlace={togglePlace}
        />
      </div>

      {/* Under the kinds: inside a place, the line saying so */}
      <div className="page-wrap place-notice-row">
        <PlaceNotice
          listing="resources"
          subject={
            oneKind ? tc(`resourceKinds.subjects.${oneKind}`) : undefined
          }
        />
      </div>

      {/* Narrowed to nothing: say so, and how to widen it again */}
      {shownResources.length === 0 && resources.length > 0 && (
        <p className="view-empty page-wrap">
          {tc('resourceKinds.empty')}{' '}
          <button type="button" onClick={resetAll}>
            {tc('eventView.reset')}
          </button>
        </p>
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

import React, { useMemo, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import Masonry from 'react-masonry-css';

import { Box, Flex, Loader } from '/imports/ui/core';

import NewEntryHelper from '../generic/NewEntryHelper';
import Honeycomb from './Honeycomb';

const breakpointColumnsObj = (isLarger: boolean) => ({
  default: 6,
  2440: isLarger ? 5 : 3,
  1920: isLarger ? 4 : 2,
  1420: isLarger ? 3 : 2,
  760: isLarger ? 2 : 1,
  480: 1,
});

const defaultItemsPerPage = 12;

// Listing pages show their items in the order the loader gave them; the
// site-wide search in the header replaced the per-page filter box.
const pageItems = (items: any[], currentPage: number, itemsPerPage: number) =>
  items ? items.slice(0, itemsPerPage * currentPage) : [];

export default function InfiniteScroller({
  canCreateContent = false,
  isMasonry = false,
  isHoneycomb = false,
  // Equal paper cards in a responsive grid (föreningar).
  isGrid = false,
  // Event cards: one per row on phones, they carry a date label and title
  gridWide = false,
  items,
  itemsPerPage = defaultItemsPerPage,
  newHelperLink,
  smallThumb = false,
  children,
}: {
  canCreateContent?: boolean;
  isMasonry?: boolean;
  isHoneycomb?: boolean;
  isGrid?: boolean;
  gridWide?: boolean;
  items: any[];
  itemsPerPage?: number;
  newHelperLink?: string;
  smallThumb?: boolean;
  children: (item: any, index: number) => React.ReactNode;
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const currentItems = useMemo(
    () => pageItems(items, currentPage, itemsPerPage),
    [items, currentPage, itemsPerPage]
  );

  const handleLoad = () => {
    setTimeout(() => {
      setCurrentPage(currentPage + 1);
    }, 300);
  };

  const hasMore =
    items?.length > currentItems?.length &&
    currentItems?.length >= itemsPerPage;

  return (
    <>
      <Box className="page-wrap" pb="8">
        <InfiniteScroll pageStart={1} loadMore={handleLoad} hasMore={hasMore}>
          {isGrid ? (
            <>
              <div className={`card-grid ${gridWide ? 'card-grid-wide' : ''}`}>
                {currentItems?.map((item, index) => children(item, index))}
                {!hasMore && canCreateContent && (
                  <NewEntryHelper buttonLink={newHelperLink || ''} small />
                )}
              </div>
              {hasMore && <Loader relative />}
            </>
          ) : isHoneycomb ? (
            <>
              <Honeycomb>
                {currentItems?.map((item, index) => children(item, index))}
              </Honeycomb>
              {hasMore && <Loader relative />}
            </>
          ) : isMasonry ? (
            <Masonry
              breakpointCols={breakpointColumnsObj(currentItems?.length > 3)}
              className="my-masonry-grid"
              columnClassName="my-masonry-grid_column"
            >
              {currentItems?.map((item, index) => children(item, index))}
              {hasMore && <Loader relative />}
              {!hasMore && canCreateContent && (
                <NewEntryHelper
                  buttonLink={newHelperLink || ''}
                  small={isMasonry || smallThumb}
                />
              )}
            </Masonry>
          ) : (
            <Flex align="center" justify="center" gap="2" wrap="wrap" w="100%">
              {currentItems?.map((item, index) => children(item, index))}
              {hasMore && <Loader relative />}
              {!hasMore && canCreateContent && (
                <NewEntryHelper
                  buttonLink={newHelperLink || ''}
                  small={smallThumb || isMasonry}
                />
              )}
            </Flex>
          )}
        </InfiniteScroll>
      </Box>
    </>
  );
}

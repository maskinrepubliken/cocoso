import { useLoaderData, useRevalidator } from 'react-router';
import React from 'react';
import { useAtomValue } from 'jotai';

import ComposablePageHybrid from '/imports/ui/entry/ComposablePageHybrid';
import BottomToolbar from './components/BottomToolbar';
import { roleAtom } from '/imports/state';
import type { Site } from '/imports/ui/types';

export default function ComposablePageHandler({ siteDoc }: { siteDoc: Site }) {
  const { composablePage } = useLoaderData();
  const role = useAtomValue(roleAtom);
  const { revalidate } = useRevalidator();

  if (!composablePage || (!composablePage.isPublished && role !== 'admin')) {
    return null;
  }

  return (
    <>
      <ComposablePageHybrid siteDoc={siteDoc} composablePage={composablePage} />
      {role === 'admin' && (
        <BottomToolbar
          currentPage={composablePage}
          getComposablePageById={revalidate}
          isPublicView
        />
      )}
    </>
  );
}

import loadable from '@loadable/component';
import React from 'react';
import { useLoaderData } from 'react-router';
import { useAtomValue } from 'jotai';

import { canCreateContentAtom, renderedAtom } from '/imports/state';
import WorksHybrid from '/imports/ui/listing/WorksHybrid';
import NewEntryHandler from '/imports/ui/forms/NewEntryHandler.loadable';

const NewWork = loadable(() => import('./NewWork'));

export default function WorkListHandler({ siteDoc }) {
  const { documents, works } = useLoaderData();
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);

  return (
    <>
      <WorksHybrid siteDoc={siteDoc} documents={documents} works={works} />

      {rendered && canCreateContent ? (
        <NewEntryHandler context="works">
          <NewWork />
        </NewEntryHandler>
      ) : null}
    </>
  );
}

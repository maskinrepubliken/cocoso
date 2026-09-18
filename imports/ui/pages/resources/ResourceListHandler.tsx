import loadable from '@loadable/component';
import React from 'react';
import { useLoaderData } from 'react-router';
import { useAtomValue } from 'jotai';

import { canCreateContentAtom, renderedAtom } from '/imports/state';
import ResourcesHybrid from '/imports/ui/listing/ResourcesHybrid';
import NewEntryHandler from '/imports/ui/forms/NewEntryHandler.loadable';

const NewResource = loadable(() => import('./NewResource'));

export default function ResourceListHandler({ siteDoc }) {
  const { documents, resources } = useLoaderData();
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);

  return (
    <>
      <ResourcesHybrid
        documents={documents}
        resources={resources}
        siteDoc={siteDoc}
      />

      {rendered && canCreateContent ? (
        <NewEntryHandler context="resources">
          <NewResource />
        </NewEntryHandler>
      ) : null}
    </>
  );
}

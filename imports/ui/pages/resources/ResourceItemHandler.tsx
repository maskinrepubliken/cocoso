import React, { useEffect } from 'react';
import loadable from '@loadable/component';
import { useLoaderData } from 'react-router';
import { atom, useAtomValue, useSetAtom } from 'jotai';

import ResourceHybrid from '/imports/ui/entry/ResourceHybrid';
import { canCreateContentAtom, renderedAtom } from '/imports/state';
import EditEntryHandler from '/imports/ui/forms/EditEntryHandler.loadable';
import NotFoundPage from '/imports/ui/pages/NotFoundPage';

const ResourceInteractionHandler = loadable(
  () => import('./components/ResourceInteractionHandler')
);
const EditResource = loadable(() => import('./EditResource'));

export const resourceAtom = atom(null);

export default function ResourceItemHandler({ siteDoc }) {
  const { documents, resource } = useLoaderData();
  const setResource = useSetAtom(resourceAtom);
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);

  useEffect(() => {
    setResource(resource);
  }, [resource]);

  if (!resource?._id) {
    return <NotFoundPage />;
  }

  return (
    <>
      <ResourceHybrid documents={documents} resource={resource} siteDoc={siteDoc} />

      {rendered && (
        <>
          <ResourceInteractionHandler />

          {canCreateContent && (
            <EditEntryHandler context="resources">
              <EditResource />
            </EditEntryHandler>
          )}
        </>
      )}
    </>
  );
}

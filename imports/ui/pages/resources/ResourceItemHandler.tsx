import React, { useEffect } from 'react';
import loadable from '@loadable/component';
import { useLoaderData, useSearchParams } from 'react-router';
import { atom, useAtomValue, useSetAtom } from 'jotai';

import ResourceHybrid from '/imports/ui/entry/ResourceHybrid';
import { canCreateContentAtom, renderedAtom, roleAtom } from '/imports/state';
import EditEntryHandler from '/imports/ui/forms/EditEntryHandler.loadable';
import NewEntryHandler from '/imports/ui/forms/NewEntryHandler.loadable';
import NotFoundPage from '/imports/ui/pages/NotFoundPage';

const ResourceInteractionHandler = loadable(
  () => import('./components/ResourceInteractionHandler')
);
const EditResource = loadable(() => import('./EditResource'));
const NewResource = loadable(() => import('./NewResource'));
const PartModal = loadable(() => import('/imports/ui/entry/PartModal'));

export const resourceAtom = atom(null);

export default function ResourceItemHandler({ siteDoc }) {
  const { documents, resource } = useLoaderData();
  const setResource = useSetAtom(resourceAtom);
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const role = useAtomValue(roleAtom);
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    setResource(resource);
  }, [resource]);

  if (!resource?._id) {
    return <NotFoundPage />;
  }

  return (
    <>
      <ResourceHybrid
        documents={documents}
        resource={resource}
        siteDoc={siteDoc}
      />

      {rendered && (
        <>
          <ResourceInteractionHandler />
          <PartModal />

          {/* The header's plus here: a new place, part of this one */}
          {canCreateContent && (
            <NewEntryHandler context="resources">
              <NewResource parentId={resource._id} />
            </NewEntryHandler>
          )}

          {canCreateContent && (
            <EditEntryHandler
              context="resources"
              onDelete={
                // Only admins may delete; the confirm dialog lives in
                // ResourceAdminFunctions
                role === 'admin'
                  ? () => setSearchParams({ delete: 'true' })
                  : undefined
              }
            >
              <EditResource />
            </EditEntryHandler>
          )}
        </>
      )}
    </>
  );
}

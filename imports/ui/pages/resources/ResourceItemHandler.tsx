import React, { useEffect } from 'react';
import loadable from '@loadable/component';
import { useLoaderData } from 'react-router';
import { atom, useAtomValue, useSetAtom } from 'jotai';

import ResourceHybrid from '/imports/ui/entry/ResourceHybrid';
import {
  canCreateContentAtom,
  currentUserAtom,
  renderedAtom,
  roleAtom,
} from '/imports/state';
import { managesPlace } from '/imports/api/resources/placeAccess';
import { isFeatureEnabled } from '/imports/api/_utils/features';
import EditEntryHandler from '/imports/ui/forms/EditEntryHandler.loadable';
import NewEntryHandler from '/imports/ui/forms/NewEntryHandler.loadable';
import NotFoundPage from '/imports/ui/pages/NotFoundPage';

const ResourceAdminFunctions = loadable(
  () => import('./components/ResourceAdminFunctions')
);
const EditResource = loadable(() => import('./EditResource'));
const NewResource = loadable(() => import('./NewResource'));
const PartModal = loadable(() => import('/imports/ui/entry/PartModal'));
const OfferingsEditor = loadable(() => import('./components/OfferingsEditor'));

export const resourceAtom = atom(null);

// A place's page. What one does with it is in the header: the gear, the
// discussion and, while bookings are on, the book button.
export default function ResourceItemHandler({ siteDoc }) {
  const { documents, resource, organizers, upcoming } = useLoaderData();
  const setResource = useSetAtom(resourceAtom);
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const role = useAtomValue(roleAtom);
  const currentUser = useAtomValue(currentUserAtom);

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
        organizers={organizers}
        resource={resource}
        siteDoc={siteDoc}
        upcoming={upcoming}
      />

      {rendered && (
        <>
          <PartModal />

          {/* The gear's dialogs: add document and delete */}
          {role === 'admin' && <ResourceAdminFunctions />}

          {/* The gear's "Äta, handla & bo": what the place offers, while
            that is switched on */}
          {isFeatureEnabled('businesses') &&
            (role === 'admin' ||
              (role === 'contributor' &&
                managesPlace(currentUser?._id, resource))) && (
              <OfferingsEditor place={resource} />
            )}

          {/* The header's plus here: a new place, part of this one */}
          {canCreateContent && (
            <NewEntryHandler keepsDraft publishes context="resources">
              <NewResource parentId={resource._id} />
            </NewEntryHandler>
          )}

          {canCreateContent && (
            <EditEntryHandler keepsDraft publishes context="resources">
              <EditResource />
            </EditEntryHandler>
          )}
        </>
      )}
    </>
  );
}

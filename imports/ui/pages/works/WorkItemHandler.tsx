import React, { useEffect } from 'react';
import loadable from '@loadable/component';
import { useLoaderData } from 'react-router';
import { atom, useAtomValue, useSetAtom } from 'jotai';

import { canCreateContentAtom, renderedAtom } from '/imports/state';
import WorkHybrid from '/imports/ui/entry/WorkHybrid';
import EditEntryHandler from '/imports/ui/forms/EditEntryHandler.loadable';

const WorkInteractionHandler = loadable(
  () => import('./components/WorkInteractionHandler')
);
const EditWork = loadable(() => import('./EditWork'));

export const workAtom = atom(null);

export default function WorkItemHandler({ siteDoc }) {
  const { documents, work } = useLoaderData();
  const setWork = useSetAtom(workAtom);
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);

  useEffect(() => {
    setWork(work);
  }, [work]);

  return (
    <>
      <WorkHybrid siteDoc={siteDoc} documents={documents} work={work} />

      {rendered && (
        <>
          <WorkInteractionHandler />

          {canCreateContent && (
            <EditEntryHandler context="works">
              <EditWork />
            </EditEntryHandler>
          )}
        </>
      )}
    </>
  );
}

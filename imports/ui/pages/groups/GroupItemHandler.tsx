import React, { useEffect } from 'react';
import loadable from '@loadable/component';
import { useLoaderData } from 'react-router';
import { atom, useAtomValue, useAtom } from 'jotai';

import GroupHybrid from '/imports/ui/entry/GroupHybrid';
import { canCreateContentAtom, renderedAtom } from '/imports/state';
import EditEntryHandler from '/imports/ui/forms/EditEntryHandler.loadable';
import NotFoundPage from '/imports/ui/pages/NotFoundPage';

const GroupInteractionHandler = loadable(
  () => import('./components/GroupInteractionHandler')
);
const EditGroup = loadable(() => import('./EditGroup'));

export const groupAtom = atom(null);

export default function GroupItemHandler({ siteDoc }) {
  const { group, documents } = useLoaderData();
  const [groupItem, setGroup] = useAtom(groupAtom);
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);

  useEffect(() => {
    setGroup(group);
  }, [group, documents]);

  // An unknown or removed group comes back as a shell without an id.
  if (!group?._id) {
    return <NotFoundPage />;
  }

  return (
    <>
      <GroupHybrid
        group={groupItem || group}
        documents={documents}
        siteDoc={siteDoc}
      />

      {rendered && (
        <>
          <GroupInteractionHandler />

          {canCreateContent && (
            <EditEntryHandler context="groups">
              <EditGroup />
            </EditEntryHandler>
          )}
        </>
      )}
    </>
  );
}

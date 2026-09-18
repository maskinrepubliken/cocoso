import loadable from '@loadable/component';
import React from 'react';
import { useLoaderData } from 'react-router';
import { useAtomValue } from 'jotai';

import { canCreateContentAtom, renderedAtom } from '/imports/state';
import GroupsHybrid from '/imports/ui/listing/GroupsHybrid';
import NewEntryHandler from '/imports/ui/forms/NewEntryHandler.loadable';
const NewGroup = loadable(() => import('./NewGroup'));

export default function GroupListHandler({ siteDoc }) {
  const { groups } = useLoaderData();
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);

  return (
    <>
      <GroupsHybrid groups={groups} siteDoc={siteDoc} />

      {rendered && canCreateContent ? (
        <NewEntryHandler context="groups">
          <NewGroup />
        </NewEntryHandler>
      ) : null}
    </>
  );
}

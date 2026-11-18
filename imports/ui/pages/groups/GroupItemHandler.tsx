import React, { useEffect } from 'react';
import loadable from '@loadable/component';
import { useLoaderData } from 'react-router';
import { useAtomValue, useAtom } from 'jotai';

import GroupHybrid from '/imports/ui/entry/GroupHybrid';
import {
  canCreateContentAtom,
  currentUserAtom,
  renderedAtom,
  roleAtom,
} from '/imports/state';
import EditEntryHandler from '/imports/ui/forms/EditEntryHandler.loadable';
import NotFoundPage from '/imports/ui/pages/NotFoundPage';

import { groupAtom } from './groupAtom';

const GroupAdminFunctions = loadable(
  () => import('./components/GroupAdminFunctions')
);
const GroupMeetingDates = loadable(
  () => import('./components/GroupMeetingDates')
);
const EditGroup = loadable(() => import('./EditGroup'));

export { groupAtom };

// A group's page. Joining and leaving are in the header
// (layout/GroupMembershipButton.tsx), the admins' choices in its gear;
// members reach the meetings from beside their heading.
export default function GroupItemHandler({ siteDoc }) {
  const { group, documents } = useLoaderData();
  const [groupItem, setGroup] = useAtom(groupAtom);
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);

  useEffect(() => {
    setGroup(group);
  }, [group, documents]);

  // An unknown or removed group comes back as a shell without an id.
  if (!group?._id) {
    return <NotFoundPage />;
  }

  const current = groupItem || group;
  // The group's admins, and the site's, who run any group as its owner
  const isGroupAdmin =
    role === 'admin' ||
    Boolean(
      currentUser &&
        current.members?.some(
          (m: any) => m.memberId === currentUser._id && m.isAdmin
        )
    );

  return (
    <>
      <GroupHybrid
        group={current}
        documents={documents}
        siteDoc={siteDoc}
        meetingsAction={rendered && <GroupMeetingDates />}
      />

      {rendered && (
        <>
          {/* The gear's dialogs: documents, meetings, members, invite,
            delete */}
          {isGroupAdmin && <GroupAdminFunctions />}

          {canCreateContent && (
            <EditEntryHandler keepsDraft context="groups">
              <EditGroup />
            </EditEntryHandler>
          )}
        </>
      )}
    </>
  );
}

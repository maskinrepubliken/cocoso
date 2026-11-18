import React, { useEffect, useState } from 'react';
import { Meteor } from 'meteor/meteor';
import loadable from '@loadable/component';
import { useLoaderData, useRevalidator } from 'react-router';
import { useAtomValue, useAtom } from 'jotai';

import GroupHybrid from '/imports/ui/entry/GroupHybrid';
import {
  canCreateContentAtom,
  currentUserAtom,
  renderedAtom,
  roleAtom,
} from '/imports/state';
import { Loader } from '/imports/ui/core';
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
  const revalidator = useRevalidator();

  useEffect(() => {
    setGroup(group);
  }, [group, documents]);

  // The server renders a page logged out, so a private group comes back
  // as not found when its page is loaded afresh. Once this browser is
  // logged in, ask again as the member one is; until then, wait rather
  // than say the group does not exist.
  const [askedAgain, setAskedAgain] = useState(false);
  const [waitingForLogin, setWaitingForLogin] = useState(false);
  useEffect(() => {
    if (group?._id) return;
    if (currentUser && !askedAgain) {
      setAskedAgain(true);
      revalidator.revalidate();
    } else if (!currentUser) {
      setWaitingForLogin(Boolean(Meteor.userId() || Meteor.loggingIn()));
    }
  }, [group?._id, currentUser]);
  // Logging in may also come to nothing: then it is not found after all
  useEffect(() => {
    if (!waitingForLogin) return undefined;
    const timer = setTimeout(() => setWaitingForLogin(false), 5000);
    return () => clearTimeout(timer);
  }, [waitingForLogin]);

  if (!group?._id) {
    const isAsking =
      (askedAgain && revalidator.state === 'loading') ||
      (waitingForLogin && !askedAgain);
    return isAsking ? <Loader /> : <NotFoundPage />;
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

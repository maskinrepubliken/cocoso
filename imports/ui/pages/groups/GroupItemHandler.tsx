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
const MeetingActions = loadable(() => import('./components/MeetingActions'));
const EditGroup = loadable(() => import('./EditGroup'));

export { groupAtom };

// A group's page. Joining and leaving are in the header
// (layout/GroupMembershipButton.tsx), the owners' choices in its gear;
// each meeting has its own buttons in the list.
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

  const current = groupItem?._id === group._id ? groupItem : group;
  // The group's owners, and the site's admins, who run any group
  const isGroupOwner =
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
        meetingActions={
          rendered && currentUser
            ? (meeting) => <MeetingActions meeting={meeting} />
            : undefined
        }
      />

      {rendered && (
        <>
          {/* The gear's dialogs: documents, meetings, members, invite,
            delete */}
          {isGroupOwner && <GroupAdminFunctions />}

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

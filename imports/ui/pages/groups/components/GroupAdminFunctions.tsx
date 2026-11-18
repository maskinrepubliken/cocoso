import React, { useEffect } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';

import DeleteEntryHandler from '/imports/ui/entry/DeleteEntryHandler';
import DocumentUploader from '/imports/ui/forms/DocumentUploader';

import AddMeeting from './admin/AddMeeting';
import { MeetingsDialog } from './GroupMeetingDates';
import ManageMembers from './admin/ManageMembers';
import InviteManager from '../InviteManager';

// The dialogs a group's admins open from the gear in the header
// (layout/EditButton.tsx), each through its search parameter.
export default function GroupAdminFunctions() {
  const { group, documents } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (group && group.isPrivate) {
      setSearchParams({ invite: 'true' });
    }
  }, []);

  const handleClose = () => {
    setSearchParams({});
  };

  const addDocument = searchParams.get('addDocument') === 'true';
  const addMeeting = searchParams.get('addMeeting') === 'true';
  const meetings = searchParams.get('meetings') === 'true';
  const members = searchParams.get('members') === 'true';

  return (
    <>
      {addDocument ? (
        <DocumentUploader
          active
          documents={documents}
          itemId={group._id}
          context="groups"
          onClose={handleClose}
        />
      ) : null}

      {addMeeting ? <AddMeeting onClose={handleClose} /> : null}
      <MeetingsDialog isAdmin open={meetings} onClose={handleClose} />
      {members ? <ManageMembers onClose={handleClose} /> : null}
      {group?.isPrivate ? <InviteManager /> : null}

      <DeleteEntryHandler item={group} context="groups" />
    </>
  );
}

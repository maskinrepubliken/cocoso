import React from 'react';
import { useLoaderData, useParams } from 'react-router';
import { useAtomValue } from 'jotai';

import UserHybrid from '/imports/ui/entry/UserHybrid';
import { renderedAtom } from '/imports/state';

import ProfileSheet from './ProfileSheet.loadable';

// An organizer's page. No sticky footer or contact popup here: the ways to
// reach them are on the page itself.
export default function UserProfileHandler({ siteDoc }) {
  const { user, events, places } = useLoaderData();
  const { slug } = useParams();
  const rendered = useAtomValue(renderedAtom);
  // Also without a user: a hidden profile is still an admin's to edit
  const username = user?.username || slug?.replace(/^@/, '');

  return (
    <>
      <UserHybrid
        events={events}
        places={places}
        siteDoc={siteDoc}
        user={user}
      />

      {/* The gear's "Redigera profil", for the person and for admins */}
      {rendered && username && <ProfileSheet username={username} />}
    </>
  );
}

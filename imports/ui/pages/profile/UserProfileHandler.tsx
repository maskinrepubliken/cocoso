import React from 'react';
import { useLoaderData } from 'react-router';

import UserHybrid from '/imports/ui/entry/UserHybrid';

// An organizer's page. No sticky footer or contact popup here: the ways to
// reach them are on the page itself.
export default function UserProfileHandler({ siteDoc }) {
  const { user, events, places } = useLoaderData();

  return (
    <UserHybrid events={events} places={places} siteDoc={siteDoc} user={user} />
  );
}

import { useLoaderData } from 'react-router';
import React from 'react';

import UsersHybrid from '/imports/ui/listing/UsersHybrid';

export default function UserListHandler({ siteDoc, pageTitles }) {
  const { keywords, users } = useLoaderData();

  return <UsersHybrid siteDoc={siteDoc} keywords={keywords} users={users} />;
}

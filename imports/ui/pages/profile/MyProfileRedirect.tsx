import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAtomValue } from 'jotai';

import { currentUserAtom } from '/imports/state';
import { Loader } from '/imports/ui/core';

// Where the profile settings used to be (/admin/my-profile and the pages
// under it, still linked from older emails and notifications): on to
// one's own page with the profile form open, which has it all now.
export default function MyProfileRedirect() {
  const currentUser = useAtomValue(currentUserAtom);
  const [waited, setWaited] = useState(false);

  // The user arrives a moment after the page; only then is no user a
  // visitor to send to the login
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (currentUser?.username) {
    return <Navigate replace to={`/@${currentUser.username}?edit=true`} />;
  }
  return waited ? <Navigate replace to="/login" /> : <Loader />;
}

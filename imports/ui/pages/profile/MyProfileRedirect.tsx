import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAtomValue } from 'jotai';

import { currentUserAtom } from '/imports/state';
import { Loader } from '/imports/ui/core';

// Where the profile settings used to be (/admin/my-profile and the pages
// under it, still linked from older emails and notifications): on to
// one's own page, with the profile form open or, for the language and
// notification pages, the settings dialog.
export default function MyProfileRedirect() {
  const currentUser = useAtomValue(currentUserAtom);
  const { pathname } = useLocation();
  const [waited, setWaited] = useState(false);

  // The user arrives a moment after the page; only then is no user a
  // visitor to send to the login
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (currentUser?.username) {
    const dialog = /\/(notifications|language)\/?$/.test(pathname)
      ? 'settings=me'
      : 'edit=true';
    return <Navigate replace to={`/@${currentUser.username}?${dialog}`} />;
  }
  return waited ? <Navigate replace to="/login" /> : <Loader />;
}

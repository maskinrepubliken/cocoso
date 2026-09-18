import React from 'react';
import { Outlet, useLoaderData, useRouteLoaderData } from 'react-router';

import UserProfileHandler from '/imports/ui/pages/profile/UserProfileHandler';
import NotFoundPage from '/imports/ui/pages/NotFoundPage';

export interface SlugData {
  kind: 'user' | 'location' | 'notFound';
  user?: any;
  location?: any;
}

// The first URL segment is either a profile (/@name) or a location (/limmared).
// The route loader decides which; this renders the matching shell.
export default function SlugHandler({ Host }: { Host: any }) {
  const data = useLoaderData() as SlugData;

  if (data?.kind === 'user') {
    return <UserProfileHandler Host={Host} />;
  }
  if (data?.kind === 'location') {
    return <Outlet />;
  }
  return <NotFoundPage />;
}

export interface SlugChildProps {
  Host: any;
  user?: React.ComponentType<any> | null;
  location?: React.ComponentType<any> | null;
  // The index route: a profile has nothing to show there, so render
  // nothing instead of a 404 inside the profile's outlet.
  emptyForUser?: boolean;
}

// A child route under /:slug renders one component for profiles and another
// for locations. Missing side means the URL does not exist for that kind.
export function SlugChild({
  Host,
  user: User,
  location: Loc,
  emptyForUser = false,
}: SlugChildProps) {
  const data = useRouteLoaderData('slug') as SlugData | undefined;

  if (data?.kind === 'user' && User) {
    return <User Host={Host} />;
  }
  if (data?.kind === 'user' && emptyForUser) {
    return null;
  }
  if (data?.kind === 'location' && Loc) {
    return <Loc Host={Host} />;
  }
  return <NotFoundPage />;
}

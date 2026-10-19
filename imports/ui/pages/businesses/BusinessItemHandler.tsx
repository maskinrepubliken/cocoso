import React from 'react';
import { useLoaderData } from 'react-router';

import BusinessHybrid from '/imports/ui/entry/BusinessHybrid';
import NotFoundPage from '/imports/ui/pages/NotFoundPage';

export default function BusinessItemHandler({ siteDoc }: { siteDoc: any }) {
  const { business } = useLoaderData() || {};

  if (!business?._id) {
    return <NotFoundPage />;
  }

  return <BusinessHybrid business={business} siteDoc={siteDoc} />;
}

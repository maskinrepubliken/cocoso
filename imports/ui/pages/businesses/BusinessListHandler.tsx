import React from 'react';
import { useLoaderData } from 'react-router';

import BusinessesHybrid from '/imports/ui/listing/BusinessesHybrid';

export default function BusinessListHandler({ siteDoc }: { siteDoc: any }) {
  const { businesses } = useLoaderData();

  return <BusinessesHybrid businesses={businesses} siteDoc={siteDoc} />;
}

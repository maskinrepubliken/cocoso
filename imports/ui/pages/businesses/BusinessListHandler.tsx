import React from 'react';
import { useLoaderData } from 'react-router';

import OfferingsHybrid from '/imports/ui/listing/OfferingsHybrid';

export default function BusinessListHandler({ siteDoc }: { siteDoc: any }) {
  const { places } = useLoaderData();

  return <OfferingsHybrid places={places} siteDoc={siteDoc} />;
}

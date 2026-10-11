import React from 'react';
import { useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box } from '/imports/ui/core';
import { locationsAtom } from '/imports/state';
import HomeHero from '/imports/ui/pages/locations/HomeHero';
import { DayAgenda, WeeklySchedule } from '/imports/ui/listing/RecurringOverview';

// The start page: the welcome band with the places, then what happens
// today and tomorrow and the week's recurring activities. The events
// themselves have their own page under /activities.
export default function HomePage({ siteDoc }: { siteDoc: any }) {
  const { activities = [] } = (useLoaderData() as { activities?: any[] }) || {};
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name ||
    (item.isMunicipalityOnly ? tc('locations.municipalityOnlyShort') : null);

  return (
    <>
      <HomeHero siteDoc={siteDoc} />
      <Box className="page-wrap" pt="1" pb="8">
        <DayAgenda activities={activities} placeOf={locationNameOf} />
        <WeeklySchedule activities={activities} placeOf={locationNameOf} />
      </Box>
    </>
  );
}

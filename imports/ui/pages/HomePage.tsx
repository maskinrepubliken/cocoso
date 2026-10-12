import React from 'react';
import { Link, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box } from '/imports/ui/core';
import { locationsAtom } from '/imports/state';
import HomeHero from '/imports/ui/pages/locations/HomeHero';
import { LocationCards } from '/imports/ui/pages/locations/LocationsGrid';
import ThreeDIcon, { sectionIcons } from '/imports/ui/generic/ThreeDIcon';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import { DayAgenda, WeeklySchedule } from '/imports/ui/listing/RecurringOverview';

// The start page: the welcome band, what happens today and tomorrow, the
// week's recurring activities, then the places to choose from and a guide
// to the site's sections. The events themselves live under /activities.
export default function HomePage({ siteDoc }: { siteDoc: any }) {
  const { activities = [] } = (useLoaderData() as { activities?: any[] }) || {};
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');
  const prefix = useLocationPrefix();

  // The site's sections, in the menu's order, each with the menu's label,
  // a line about what it is for (home.sections.<name>) and a link.
  const sections = (siteDoc?.settings?.menu || [])
    .filter((item: any) => item.isVisible && !item.isComposablePage)
    .filter((item: any) => sectionIcons[item.name]);

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name ||
    (item.isMunicipalityOnly ? tc('locations.municipalityOnlyShort') : null);

  return (
    <>
      <HomeHero siteDoc={siteDoc} />
      <Box className="page-wrap" pt="1" pb="8">
        <DayAgenda activities={activities} placeOf={locationNameOf} />
        <WeeklySchedule activities={activities} placeOf={locationNameOf} />

        {locations.length > 0 && (
          <section className="home-places" aria-labelledby="home-places-title">
            <h2 id="home-places-title" className="home-sections-title">
              {tc('locations.grid.title')}
            </h2>
            <p className="home-sections-intro">{tc('locations.grid.intro')}</p>
            <LocationCards
              locations={locations}
              all={{ name: tc('locations.municipalityOnlyShort'), to: '/activities' }}
            />
          </section>
        )}

        {sections.length > 0 && (
          <section className="home-sections" aria-labelledby="home-sections-title">
            <h2 id="home-sections-title" className="home-sections-title">
              {tc('home.sections.title')}
            </h2>
            <p className="home-sections-intro">{tc('home.sections.intro')}</p>
            <div className="home-section-grid">
              {sections.map((item: any) => (
                <Link
                  key={item.name}
                  className="home-section"
                  to={`${prefix}/${item.name}`}
                >
                  <ThreeDIcon name={sectionIcons[item.name]} size={56} />
                  <span className="home-section-text">
                    <strong>{item.label}</strong>
                    <span>{tc(`home.sections.${item.name}`)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </Box>
    </>
  );
}

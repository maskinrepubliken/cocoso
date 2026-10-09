import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { locationsAtom, seasonAtom, siteAtom } from '/imports/state';
import { call } from '/imports/api/_utils/shared';
import type { Season } from '/imports/api/_utils/season';
import ThreeDIcon, { type ThreeDIconName } from '/imports/ui/generic/ThreeDIcon';
import { LocationCards } from './LocationsGrid';

interface HomeHeroProps {
  siteDoc?: any;
}

// Four icons that belong to the season; the first is also the season
// badge's icon.
export const seasonIcons: Record<Season, ThreeDIconName[]> = {
  var: ['sun', 'flag', 'music', 'camera'],
  sommar: ['glass', 'sun', 'trophy', 'music'],
  host: ['umbrella', 'fire', 'cup', 'chess'],
  vinter: ['tea-cup', 'gift', 'star', 'bell'],
};

// The welcome band at the top of the start page. The header above it is
// deliberately compact, so this is where a first-time visitor is told where
// they have arrived: the site's name, one line about what it is, and the
// municipality's places as the way in. Woven texture and two seasonal glows
// behind, a cluster of seasonal 3D icons to the right. Rendered only at the
// root.
export default function HomeHero({ siteDoc }: HomeHeroProps) {
  const site = useAtomValue(siteAtom) || siteDoc;
  const locations = useAtomValue(locationsAtom);
  const season = useAtomValue(seasonAtom);
  const [tc] = useTranslation('common');
  const [organizerCount, setOrganizerCount] = useState<number | null>(null);

  useEffect(() => {
    call<number>('getOrganizerCount')
      .then((count) => setOrganizerCount(count))
      .catch(() => setOrganizerCount(null));
  }, []);

  const settings = site?.settings;
  if (!settings?.name) {
    return null;
  }

  const hasLocations = locations && locations.length > 0;
  const icons = seasonIcons[season] || seasonIcons.host;

  // "Tranemo Evenemangskalender (BETA)" → the name, plus "BETA" as a small
  // label beside it rather than part of the big title.
  const match = settings.name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const title = match ? match[1] : settings.name;
  const label = match ? match[2] : null;
  const place = settings.shortName || settings.name;

  return (
    <section className="home-hero vav">
      <div className="home-hero-inner">
        <span className="season-badge">
          <ThreeDIcon name={icons[0]} size={26} />
          {tc('home.hero.seasonIn', {
            season: tc(`seasons.${season}`),
            place,
          })}
        </span>

        <div className="home-hero-icons" aria-hidden="true">
          {icons.map((name, index) => (
            <ThreeDIcon
              key={name}
              className={`home-hero-icon is-${index + 1}`}
              name={name}
              size={[150, 120, 110, 90][index]}
            />
          ))}
        </div>

        <div className="home-hero-text">
          <span className="home-hero-eyebrow">{tc('home.hero.welcome')}</span>
          <h1 className="home-hero-title">
            {title}
            {label && <span className="home-hero-flag">{label}</span>}
          </h1>
          <p className="home-hero-tagline">
            {settings.tagline || tc('home.hero.tagline')}
            {organizerCount !== null && organizerCount > 0 && (
              <>
                {' '}
                <span className="home-hero-thanks">
                  {tc('home.hero.thanks', { count: organizerCount })}
                </span>
              </>
            )}
          </p>
        </div>

        {hasLocations && (
          <div className="home-hero-places">
            <span className="home-hero-label">
              {tc('locations.grid.title')}
            </span>
            <LocationCards locations={locations} />
          </div>
        )}
      </div>
    </section>
  );
}

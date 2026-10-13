import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { seasonAtom, siteAtom } from '/imports/state';
import type { Season } from '/imports/api/_utils/season';
import ThreeDIcon, { type ThreeDIconName } from '/imports/ui/generic/ThreeDIcon';

interface HomeHeroProps {
  siteDoc?: any;
}

// Four icons that belong to the season. The crane stands behind them,
// every season, watching.
export const seasonIcons: Record<Season, ThreeDIconName[]> = {
  var: ['sun', 'flag', 'music', 'camera'],
  sommar: ['sun', 'travel', 'trophy', 'music'],
  host: ['umbrella', 'fire', 'cup', 'chess'],
  vinter: ['tea-cup', 'gift', 'star', 'bell'],
};

// The welcome band at the top of the start page. The header above it is
// deliberately compact, so this is where a first-time visitor is told where
// they have arrived: the site's name, one line about what it is, and the
// what it is for. Woven texture and two seasonal glows behind, a cluster of
// seasonal 3D icons to the right. Rendered only at the root; the places
// come further down the page.
export default function HomeHero({ siteDoc }: HomeHeroProps) {
  const site = useAtomValue(siteAtom) || siteDoc;
  const season = useAtomValue(seasonAtom);
  const [tc] = useTranslation('common');

  const settings = site?.settings;
  if (!settings?.name) {
    return null;
  }

  const icons = seasonIcons[season] || seasonIcons.host;


  return (
    <section className="home-hero vav">
      <div className="home-hero-inner">
        <div className="home-hero-icons" aria-hidden="true">
          <ThreeDIcon className="home-hero-crane" name="trana" size={230} />
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
          <h1 className="home-hero-title">{settings.name}</h1>
          <p className="home-hero-tagline">
            {settings.tagline || tc('home.hero.tagline')}
          </p>
        </div>
      </div>
    </section>
  );
}

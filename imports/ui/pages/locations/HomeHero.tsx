import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { locationsAtom, siteAtom } from '/imports/state';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import { LocationCards } from './LocationsGrid';

interface HomeHeroProps {
  siteDoc?: any;
}

// The welcome band at the top of the start page. The header above it is
// deliberately compact, so this is where a first-time visitor is told where
// they have arrived: the site's name, one line about what it is, and the
// municipality's places as the way in. Rendered only at the root.
export default function HomeHero({ siteDoc }: HomeHeroProps) {
  const site = useAtomValue(siteAtom) || siteDoc;
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');

  const settings = site?.settings;
  if (!settings?.name) {
    return null;
  }

  const hasLocations = locations && locations.length > 0;

  // "Tranemo Evenemangskalender (BETA)" → the name, plus "BETA" as a small
  // label beside it rather than part of the big title.
  const match = settings.name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const title = match ? match[1] : settings.name;
  const label = match ? match[2] : null;

  return (
    <section className="home-hero">
      <PlaceholderImage className="home-hero-bg" seed={settings.name} />
      <div className="home-hero-inner">
        <div className="home-hero-icons" aria-hidden="true">
          <ThreeDIcon className="home-hero-icon is-1" name="megaphone" size={150} />
          <ThreeDIcon className="home-hero-icon is-2" name="calendar" size={120} />
          <ThreeDIcon className="home-hero-icon is-3" name="map-pin" size={110} />
          <ThreeDIcon className="home-hero-icon is-4" name="puzzle" size={90} />
        </div>
        <div className="home-hero-text">
          <span className="home-hero-eyebrow">{tc('home.hero.welcome')}</span>
          <h1 className="home-hero-title">
            {title}
            {label && <span className="home-hero-flag">{label}</span>}
          </h1>
          <p className="home-hero-tagline">
            {settings.tagline || tc('home.hero.tagline')}
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

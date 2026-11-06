import React from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { seasonAtom, siteAtom } from '/imports/state';
import type { Season } from '/imports/api/_utils/season';
import ThreeDIcon, {
  type ThreeDIconName,
} from '/imports/ui/generic/ThreeDIcon';

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
// they have arrived: the site's name and one line about what it is for,
// on a woven texture with two seasonal glows behind. Rendered only at the
// root; the places come further down the page.
//
// Three versions, picked with ?hem=:
// - (none): text only, the welcome line, the name as a large title and
//   the tagline
// - mats: the colourful "tranemokalendern" word logo
// - ikoner: the title with a cluster of seasonal 3D icons to the right
export default function HomeHero({ siteDoc }: HomeHeroProps) {
  const site = useAtomValue(siteAtom) || siteDoc;
  const season = useAtomValue(seasonAtom);
  const [tc] = useTranslation('common');
  const [searchParams] = useSearchParams();

  const settings = site?.settings;
  if (!settings?.name) {
    return null;
  }

  const variant = searchParams.get('hem');
  const tagline = (
    <p className="home-hero-tagline">
      {settings.tagline || tc('home.hero.tagline')}
    </p>
  );

  if (variant === 'mats') {
    return (
      <section className="home-hero vav is-logo">
        <div className="home-hero-inner">
          <div className="home-hero-text">
            <h1 className="home-hero-logo">
              <img src="/images/tranemokalendern.svg" alt={settings.name} />
            </h1>
            {tagline}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'ikoner') {
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
            {tagline}
          </div>
        </div>
      </section>
    );
  }

  // When the name begins with the short name ("Tranemo" + "kalendern"),
  // the rest is set in a softer green.
  const short = settings.shortName;
  const rest =
    short &&
    settings.name.startsWith(short) &&
    settings.name.length > short.length
      ? settings.name.slice(short.length)
      : null;

  return (
    <section className="home-hero vav is-text">
      <div className="home-hero-inner">
        <div className="home-hero-text">
          <span className="home-hero-eyebrow">{tc('home.hero.welcome')}</span>
          <h1 className="home-hero-title">
            {rest ? (
              <>
                {short}
                <span className="home-hero-title-rest">{rest}</span>
              </>
            ) : (
              settings.name
            )}
          </h1>
          {tagline}
          <p className="home-hero-beta">
            <span className="home-hero-beta-icon" aria-hidden="true">
              <ThreeDIcon name="lab" size={46} />
            </span>
            <span>
              <strong>{tc('home.hero.beta')}</strong>
              {tc('home.hero.betaNote')}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

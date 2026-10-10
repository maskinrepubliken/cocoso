import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import CheckIcon from 'lucide-react/dist/esm/icons/check';
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronRightIcon from 'lucide-react/dist/esm/icons/chevron-right';
import LandmarkIcon from 'lucide-react/dist/esm/icons/landmark';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import XIcon from 'lucide-react/dist/esm/icons/x';
import { useAtomValue } from 'jotai';

import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import { locationsAtom } from '/imports/state';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';
import type { HeaderMenuItem } from './Header';

interface LocationSwitcherProps {
  site: any;
  items: HeaderMenuItem[];
  section: string;
}

// The brand pill: logo mark + site name, and when zoomed in on a place,
// "/ <place>" with a cross that zooms back out. The whole municipality is
// the default state, so at the root the pill is just the site itself with a
// small chevron; places are a filter you add, not a choice among equals.
export default function LocationSwitcher({
  site,
  items,
  section,
}: LocationSwitcherProps) {
  const locations = useAtomValue(locationsAtom);
  const current = useCurrentLocation();
  const navigate = useNavigate();
  const [tc] = useTranslation('common');

  const settings = site?.settings;
  const name = settings?.shortName || settings?.name || '';
  const hasLocations = locations && locations.length > 0;

  // Keep the section we are in when switching place, when it exists.
  const sectionItem = items.find((item) => item.name === section);
  const routeFor = (prefix: string) => {
    if (!sectionItem) {
      return prefix || '/';
    }
    return sectionItem.isComposablePage
      ? `${prefix}/cp/${sectionItem.name}`
      : `${prefix}/${sectionItem.name}`;
  };

  const goTo = (prefix: string) => navigate(routeFor(prefix));

  const mark = site?.logo ? (
    <img alt="" className="site-brand-mark" src={site.logo} />
  ) : (
    <span className="site-brand-mark">{name.charAt(0)}</span>
  );

  const home = (
    <Link className="site-brand-home" to="/" aria-label={settings?.name}>
      {mark}
      <span className="site-brand-name">{name}</span>
    </Link>
  );

  if (!hasLocations) {
    return <div className="site-brand">{home}</div>;
  }

  const trigger = current ? (
    <span className="site-brand-loc">{current.name}</span>
  ) : (
    <span className="site-brand-loc is-root">
      <ChevronDownIcon width={15} height={15} />
    </span>
  );

  return (
    <div className={`site-brand ${current ? 'has-location' : ''}`}>
      {home}
      {current && <span className="site-brand-sep">/</span>}

      <Menu
        align="start"
        ariaLabel={current ? undefined : tc('locations.switcher.open')}
        button={trigger}
      >
        <div className="site-loc-menu">
          <MenuItem
            className={`site-loc-home ${current ? '' : 'is-current'}`}
            onClick={() => goTo('')}
          >
            <span className="site-loc-home-icon">
              <LandmarkIcon width={18} height={18} />
            </span>
            <span className="site-loc-home-text">
              <b>{tc('locations.switcher.whole')}</b>
              <small>{tc('locations.switcher.wholeHelper')}</small>
            </span>
            {current ? (
              <ChevronRightIcon className="site-loc-home-end" width={16} height={16} />
            ) : (
              <CheckIcon className="site-loc-home-end" width={16} height={16} />
            )}
          </MenuItem>

          <div className="site-loc-label">
            {current
              ? tc('locations.label')
              : tc('locations.switcher.zoom')}
          </div>

          {locations.map((location) => (
            <MenuItem
              key={location._id}
              className={`site-loc-item ${
                current?._id === location._id ? 'is-current' : ''
              }`}
              onClick={() => goTo(`/${location.slug}`)}
            >
              <MapPinIcon width={15} height={15} />
              {location.name}
            </MenuItem>
          ))}
        </div>
      </Menu>

      {current && (
        <Link
          className="site-brand-clear"
          to={routeFor('')}
          aria-label={tc('locations.switcher.clear')}
          title={tc('locations.switcher.clear')}
        >
          <XIcon width={11} height={11} strokeWidth={3} />
        </Link>
      )}
    </div>
  );
}

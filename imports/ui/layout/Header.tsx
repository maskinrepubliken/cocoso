import { Meteor } from 'meteor/meteor';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down';

import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import { parseTitle } from '/imports/api/_utils/shared';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import LocationSwitcher from './LocationSwitcher';
import UserPopup from './UserPopup';

const isClient = Meteor?.isClient;

if (isClient) {
  import '@szhsin/react-menu/dist/index.css';
  import '@szhsin/react-menu/dist/transitions/zoom.css';
}

// Visible menu entries with their route resolved, so the desktop pill, the
// mobile chip row and the location switcher all agree on what a section is.
export interface HeaderMenuItem {
  name: string;
  label: string;
  isComposablePage?: boolean;
  route: string;
}

export function getMenuItems(site: any, prefix: string): HeaderMenuItem[] {
  const menu = site?.settings?.menu || [];
  return menu
    .filter((item: any) => item.isVisible)
    .map((item: any) => ({
      name: item.name,
      label: item.label,
      isComposablePage: item.isComposablePage,
      route: item.isComposablePage
        ? `${prefix}/cp/${item.name}`
        : `${prefix}/${item.name}`,
    }));
}

// The first path segment after the location prefix: 'activities',
// 'calendar', 'info', … or '' at a home page.
export function getCurrentSection(pathname: string, prefix: string): string {
  const rest = prefix ? pathname.slice(prefix.length) : pathname;
  const first = rest.split('/')[1] || '';
  return first === 'cp' ? rest.split('/')[2] || '' : first;
}

export interface InfoPagesMenuProps {
  label: string;
  pageTitles: any[];
  isActive: boolean;
  prefix?: string;
  className?: string;
  onSelect?: () => void;
}

export function InfoPagesMenu({
  label,
  pageTitles,
  isActive,
  prefix = '',
  className = '',
  onSelect,
}: InfoPagesMenuProps) {
  return (
    <Menu
      align="end"
      button={
        <span
          className={`${className} ${isActive ? 'is-active' : ''}`}
          suppressHydrationWarning
        >
          {label}
          <ChevronDownIcon className="site-nav-chevron" width={13} height={13} />
        </span>
      }
    >
      <div className="site-info-menu">
        {pageTitles?.map((item) => (
          <MenuItem key={item._id} style={{ padding: 0 }}>
            <Link
              className="site-info-menu-link"
              to={`${prefix}/info/${parseTitle(item.title)}`}
              onClick={onSelect}
            >
              {item.title}
            </Link>
          </MenuItem>
        ))}
      </div>
    </Menu>
  );
}

interface NavProps {
  items: HeaderMenuItem[];
  section: string;
  pageTitles: any[];
  prefix: string;
  className: string;
  itemClassName: string;
}

// One list of links, styled as a white pill on desktop and as a scrolling
// chip row on narrower screens (see client/main.css).
function Nav({
  items,
  section,
  pageTitles,
  prefix,
  className,
  itemClassName,
}: NavProps) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Keep the active chip visible when the section changes on mobile.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    });
  }, [section]);

  const isActive = (item: HeaderMenuItem, index: number) =>
    section === '' ? index === 0 : section === item.name;

  return (
    <nav className={className}>
      {items.map((item, index) =>
        item.name === 'info' ? (
          <InfoPagesMenu
            key="info"
            className={itemClassName}
            isActive={isActive(item, index)}
            label={item.label}
            pageTitles={pageTitles}
            prefix={prefix}
          />
        ) : (
          <Link
            key={item.name}
            ref={isActive(item, index) ? activeRef : undefined}
            className={`${itemClassName} ${
              isActive(item, index) ? 'is-active' : ''
            }`}
            to={item.route}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}

export interface HeaderProps {
  site: any;
  pageTitles: any[];
}

// The site header: one 56px row with the brand/location pill on the left,
// the menu as a floating pill in the middle and the account on the right.
// Below 960px the menu moves to a chip row under the bar. The bar is
// transparent at the top of the page and gains a blurred backdrop once the
// page scrolls.
export default function Header({ site, pageTitles }: HeaderProps) {
  const location = useLocation();
  const prefix = useLocationPrefix();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isClient) {
      return undefined;
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!site) {
    return null;
  }

  const items = getMenuItems(site, prefix);
  const section = getCurrentSection(location.pathname, prefix);

  return (
    <header
      id="header"
      className={`site-header ${scrolled ? 'is-scrolled' : ''}`}
    >
      <div className="site-header-bar">
        <LocationSwitcher site={site} items={items} section={section} />

        <Nav
          className="site-nav"
          itemClassName="site-nav-item"
          items={items}
          pageTitles={pageTitles}
          prefix={prefix}
          section={section}
        />

        <div className="site-header-right">
          <UserPopup site={site} />
        </div>
      </div>

      <Nav
        className="site-chips"
        itemClassName="site-chip"
        items={items}
        pageTitles={pageTitles}
        prefix={prefix}
        section={section}
      />
    </header>
  );
}

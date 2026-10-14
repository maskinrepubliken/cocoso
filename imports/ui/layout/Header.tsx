import { Meteor } from 'meteor/meteor';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down';
import LayoutGridIcon from 'lucide-react/dist/esm/icons/layout-grid';
import XIcon from 'lucide-react/dist/esm/icons/x';
import { useAtomValue } from 'jotai';

import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import ThreeDIcon, { sectionIcons } from '/imports/ui/generic/ThreeDIcon';
import { parseTitle } from '/imports/api/_utils/shared';
import { currentUserAtom } from '/imports/state';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import EditButton from './EditButton';
import LanguageSwitch from './LanguageSwitch';
import LocationSwitcher from './LocationSwitcher';
import NewButton from './NewButton';
import SiteSearch from './SiteSearch';
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

export function getMenuItems(
  site: any,
  prefix: string,
  homeLabel?: string
): HeaderMenuItem[] {
  const menu = site?.settings?.menu || [];
  const home: HeaderMenuItem[] = homeLabel
    ? [{ name: 'home', label: homeLabel, route: prefix || '/' }]
    : [];
  return home.concat(
    menu
      .filter((item: any) => item.isVisible)
      .map((item: any) => ({
        name: item.name,
        label: item.label,
        isComposablePage: item.isComposablePage,
        route: item.isComposablePage
          ? `${prefix}/cp/${item.name}`
          : `${prefix}/${item.name}`,
      }))
  );
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
          <ChevronDownIcon
            className="site-nav-chevron"
            width={13}
            height={13}
          />
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
  const navRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState('');

  // Keep the active chip visible when the section changes on mobile.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    });
  }, [section]);

  // Fade the edge that has more chips behind it, so the row reads as
  // scrollable on a phone.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !isClient) {
      return undefined;
    }
    const update = () => {
      const left = nav.scrollLeft > 4;
      const right = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4;
      setScrollState(
        `${left ? 'can-scroll-left' : ''} ${right ? 'can-scroll-right' : ''}`
      );
    };
    update();
    nav.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      nav.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items.length]);

  const isActive = (item: HeaderMenuItem, index: number) =>
    section === ''
      ? item.name === 'home' || index === 0
      : section === item.name;

  return (
    <nav className={`${className} ${scrollState}`} ref={navRef}>
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

interface MenuPanelProps {
  items: HeaderMenuItem[];
  section: string;
  pageTitles: any[];
  prefix: string;
  pathname: string;
  loginLabel: string;
}

// The phone's menu, opened from the grid button in the bar: one row per
// section with the section's own 3D icon, the info pages as rows of their
// own, and below that language and login, in the same panel style as the
// account menu and the search results.
function MenuPanel({
  items,
  section,
  pageTitles,
  prefix,
  pathname,
  loginLabel,
}: MenuPanelProps) {
  const currentUser = useAtomValue(currentUserAtom);
  const isActive = (item: HeaderMenuItem, index: number) =>
    section === ''
      ? item.name === 'home' || index === 0
      : section === item.name;

  return (
    <div className="site-menu-panel" id="site-menu-panel">
      {items.map((item, index) =>
        item.name === 'info' ? (
          pageTitles?.map((page) => {
            const to = `${prefix}/info/${parseTitle(page.title)}`;
            return (
              <Link
                key={page._id}
                className={`site-menu-row ${
                  pathname === to ? 'is-active' : ''
                }`}
                to={to}
              >
                <ThreeDIcon name={sectionIcons.info} size={32} />
                <span>{page.title}</span>
              </Link>
            );
          })
        ) : (
          <Link
            key={item.name}
            className={`site-menu-row ${
              isActive(item, index) ? 'is-active' : ''
            }`}
            to={item.route}
          >
            <ThreeDIcon
              name={
                item.name === 'home'
                  ? 'trana'
                  : sectionIcons[item.name] || 'star'
              }
              size={32}
            />
            <span>{item.label}</span>
          </Link>
        )
      )}
      {!currentUser && (
        <Link className="site-info-menu-link" to="/login">
          {loginLabel}
        </Link>
      )}
      <div className="site-menu-langs">
        <LanguageSwitch variant="row" />
      </div>
    </div>
  );
}

export interface HeaderProps {
  site: any;
  pageTitles: any[];
}

// The site header: one 56px row with the brand/location pill on the left,
// the menu as a floating pill in the middle and, on the right, the search,
// the plus for those who may create content, the pen on a page one may
// edit, and the account.
// Below 960px the menu moves to a chip row under the bar. The bar is
// transparent at the top of the page and gains a blurred backdrop once the
// page scrolls.
// The site header: one 56px row with the brand/location pill on the left,
// the menu as a floating pill in the middle and, on the right, the search,
// the plus for those who may create content, the pen on a page one may
// edit, and the account.
// Below 960px the menu pill is gone: the brand pill stretches across the
// row and a grid button beside the search opens the menu panel. The bar
// is transparent at the top of the page and gains a blurred backdrop once
// the page scrolls.
export default function Header({ site, pageTitles }: HeaderProps) {
  const location = useLocation();
  const prefix = useLocationPrefix();
  const [tc] = useTranslation('common');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close the menu panel when the route changes (state during render, so
  // the panel never flashes on the new page).
  const [seenPathname, setSeenPathname] = useState(location.pathname);
  if (seenPathname !== location.pathname) {
    setSeenPathname(location.pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!isClient) {
      return undefined;
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The menu panel closes on Escape and on a tap outside the header.
  useEffect(() => {
    if (!isClient || !menuOpen) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  if (!site) {
    return null;
  }

  const items = getMenuItems(site, prefix, tc('menu.home'));
  const section = getCurrentSection(location.pathname, prefix);
  const current = items.find((item) => item.name === section) || items[0];

  return (
    <header
      id="header"
      ref={headerRef}
      className={`site-header ${scrolled ? 'is-scrolled' : ''} ${
        menuOpen ? 'is-menu-open' : ''
      }`}
    >
      <div className="site-header-bar">
        <LocationSwitcher site={site} items={items} section={section} />

        {/* Phone only: the menu button, carrying the page one is on */}
        <button
          type="button"
          className={`site-more ${menuOpen ? 'is-open' : ''}`}
          aria-label={tc('menu.allSections')}
          aria-expanded={menuOpen}
          aria-controls="site-menu-panel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="site-more-label">{current?.label}</span>
          {menuOpen ? (
            <XIcon width={16} height={16} />
          ) : (
            <LayoutGridIcon width={16} height={16} />
          )}
        </button>

        <Nav
          className="site-nav"
          itemClassName="site-nav-item"
          items={items}
          pageTitles={pageTitles}
          prefix={prefix}
          section={section}
        />

        <div className="site-header-right">
          <SiteSearch site={site} />
          <NewButton site={site} />
          <EditButton />
          <UserPopup site={site} />
        </div>
      </div>

      {menuOpen &&
        isClient &&
        createPortal(
          <div
            className="site-menu-scrim"
            onPointerDown={() => setMenuOpen(false)}
          />,
          document.body
        )}
      {menuOpen && (
        <MenuPanel
          items={items}
          section={section}
          pageTitles={pageTitles}
          prefix={prefix}
          pathname={location.pathname}
          loginLabel={tc('menu.guest.login')}
        />
      )}
    </header>
  );
}

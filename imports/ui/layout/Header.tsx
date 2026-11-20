import { Meteor } from 'meteor/meteor';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down';
import LayoutGridIcon from 'lucide-react/dist/esm/icons/layout-grid';
import XIcon from 'lucide-react/dist/esm/icons/x';
import { useAtomValue } from 'jotai';

import { isMenuItemShown } from '/imports/api/_utils/features';
import Menu, { MenuItem } from '/imports/ui/generic/Menu';
import ThreeDIcon, { sectionIcons } from '/imports/ui/generic/ThreeDIcon';
import { parseTitle } from '/imports/api/_utils/shared';
import sectionDescription from '/imports/ui/utils/sectionDescription';
import { currentUserAtom } from '/imports/state';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import Brand from './Brand';
import DiscussionButton from './DiscussionButton';
import GroupMembershipButton from './GroupMembershipButton';
import EditButton from './EditButton';
import LanguageSwitch from './LanguageSwitch';
import NewButton from './NewButton';
import SiteSearch from './SiteSearch';

const isClient = Meteor?.isClient;

if (isClient) {
  import '@szhsin/react-menu/dist/index.css';
  import '@szhsin/react-menu/dist/transitions/zoom.css';
}

// Visible menu entries with their route resolved, so the desktop pill and
// the mobile menu panel agree on what a section is.
export interface HeaderMenuItem {
  name: string;
  label: string;
  description?: string;
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
    menu.filter(isMenuItemShown).map((item: any) => ({
      name: item.name,
      label: item.label,
      description: item.description,
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
  // What closes the pill after the links: the search
  children?: React.ReactNode;
}

// One list of links and, last in it, the search: a white pill on desktop.
// On a phone the links and the search are rows of the menu panel instead,
// and of this only the open search field shows (see client/main.css).
function Nav({
  items,
  section,
  pageTitles,
  prefix,
  className,
  itemClassName,
  children,
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
      {children}
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
  onSearch: () => void;
}

// The phone's menu, opened from the grid button in the bar: the search
// first, then one row per section with the section's own 3D icon, the info pages as rows of their
// own, and below that language and login, in the same panel style as the
// account menu and the search results.
function MenuPanel({
  items,
  section,
  pageTitles,
  prefix,
  pathname,
  loginLabel,
  onSearch,
}: MenuPanelProps) {
  const currentUser = useAtomValue(currentUserAtom);
  const [tc] = useTranslation('common');
  const home = items.find((item) => item.name === 'home');
  const isActive = (item: HeaderMenuItem, index: number) =>
    section === ''
      ? item.name === 'home' || index === 0
      : section === item.name;

  return (
    <div className="site-menu-panel" id="site-menu-panel">
      <button type="button" className="site-menu-row" onClick={onSearch}>
        <ThreeDIcon name="zoom" size={32} />
        <span>{tc('search.open')}</span>
      </button>
      {items.map((item, index) =>
        item.name === 'home' ? null : item.name === 'info' ? (
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
            <ThreeDIcon name={sectionIcons[item.name] || 'star'} size={32} />
            <span className="site-menu-row-text">
              <span className="site-menu-row-title">{item.label}</span>
              {sectionDescription(item, tc) && (
                <span className="site-menu-row-detail">
                  {sectionDescription(item, tc)}
                </span>
              )}
            </span>
          </Link>
        )
      )}
      {!currentUser && (
        <Link className="site-info-menu-link" to="/login">
          {loginLabel}
        </Link>
      )}
      <div className="site-menu-langs">
        {home && (
          <Link
            className={`site-footer-lang site-menu-home ${
              section === '' ? 'is-active' : ''
            }`}
            to={home.route}
          >
            {home.label}
          </Link>
        )}
        <LanguageSwitch variant="row" />
      </div>
    </div>
  );
}

export interface HeaderProps {
  site: any;
  pageTitles: any[];
}

// The site header: one 56px row with the brand pill (and in it the
// account) on the left, the menu as a floating pill in the middle with
// the search at its end and, on the right, the plus for those who may
// create content, the pen on a page one may edit, and the page's
// discussion.
// Below 960px the menu's links and the search are gone from the bar: a
// grid button opens the menu panel, which has them as rows. The bar
// is transparent at the top of the page and gains a blurred backdrop once
// the page scrolls.
// The bar's groups shrink to at most this much before the menu pill
// gives up its place on the row.
const MIN_BAR_ZOOM = 0.72;
// The username beside the avatar: its side padding and widest size, as
// in client/main.css (.site-user-name).
const USER_NAME_PADDING = 18;
const USER_NAME_MAX = 180;
// Text is a few pixels wider or narrower at each zoom, so the measured
// widths wander: the bar grows back, and the username comes back, only
// when there is this much room to spare. Without it the bar can flicker
// between two sizes at a width right on the edge.
const FIT_SLACK = 32;

export default function Header({ site, pageTitles }: HeaderProps) {
  const location = useLocation();
  const prefix = useLocationPrefix();
  const [tc] = useTranslation('common');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // How much the bar's three groups are shrunk to fit on one row (1 = not
  // at all), and whether even the smallest size would not do.
  const [barZoom, setBarZoom] = useState(1);
  const [stacked, setStacked] = useState(false);
  // Whether the logged-in user's name fits beside the avatar without
  // anything else in the bar having to shrink for it.
  const [showUserName, setShowUserName] = useState(false);
  // Opens the search (SiteSearch sets it), for the row in the menu panel
  const openSearchRef = useRef<(() => void) | null>(null);
  const zoomRef = useRef(1);
  const userNameShownRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

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

  // On a desktop the menu pill sits between the brand and the buttons.
  // When the three no longer fit on one row (an admin's plus and pen,
  // a long menu) all three shrink by the same factor until
  // they do, down to MIN_BAR_ZOOM; only past that does the menu pill drop
  // to a row of its own. Measured, so nothing changes while it fits.
  // The username beside the avatar is an extra: shown only when the row
  // fits at full size with it, and left out of the fitting otherwise.
  useEffect(() => {
    const bar = barRef.current;
    if (!isClient || !bar || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const measure = () => {
      if (!window.matchMedia('(min-width: 960px)').matches) {
        zoomRef.current = 1;
        setBarZoom(1);
        setStacked(false);
        userNameShownRef.current = false;
        setShowUserName(false);
        return;
      }
      // While the search is open its field lies over the menu pill:
      // nothing to fit.
      if (bar.querySelector('.site-search.is-open')) {
        return;
      }
      const left = bar.querySelector<HTMLElement>('.site-header-left');
      const nav = bar.querySelector<HTMLElement>('.site-nav');
      const right = bar.querySelector<HTMLElement>('.site-header-right');
      if (!left || !nav || !right) {
        return;
      }
      const style = getComputedStyle(bar);
      const gaps =
        2 * parseFloat(style.columnGap || '0') +
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight);
      // Natural widths: scrollWidth is in each group's own (unzoomed)
      // pixels and counts the content even when the grid squeezes the box.
      // The menu stays centred, so both sides need room for the wider one.
      const naturalWith = (leftWidth: number) =>
        nav.scrollWidth + 2 * Math.max(leftWidth, right.scrollWidth);
      const room = bar.clientWidth - gaps;
      // The username takes no room while hidden (max-width 0), but its
      // scrollWidth still tells how wide it would be.
      const name = left.querySelector<HTMLElement>('.site-user-name');
      const nameWidth = name
        ? Math.min(name.scrollWidth + USER_NAME_PADDING, USER_NAME_MAX)
        : 0;
      const leftBase = left.scrollWidth - (name?.offsetWidth || 0);
      const nameFits =
        nameWidth > 0 &&
        naturalWith(leftBase + nameWidth) +
          (userNameShownRef.current ? 0 : FIT_SLACK) <=
          room;
      userNameShownRef.current = nameFits;
      setShowUserName(nameFits);
      const natural = naturalWith(leftBase + (nameFits ? nameWidth : 0));
      const zoom = Math.min(1, room / natural);
      let next = zoom < MIN_BAR_ZOOM ? 1 : Math.round(zoom * 100) / 100;
      if (zoom >= MIN_BAR_ZOOM && next > zoomRef.current) {
        const relaxed = Math.min(1, room / (natural + FIT_SLACK));
        next = Math.max(zoomRef.current, Math.floor(relaxed * 100) / 100);
      }
      if (Math.abs(next - zoomRef.current) >= 0.01) {
        zoomRef.current = next;
        setBarZoom(next);
      }
      setStacked(zoom < MIN_BAR_ZOOM);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    bar
      .querySelectorAll('.site-header-left, .site-nav, .site-header-right')
      .forEach((el) => observer.observe(el));
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [location.pathname]);

  // The menu panel closes on Escape and on a tap anywhere but the panel
  // and its button, so opening the search or another menu puts it away:
  // never two popups at once.
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
      const target = event.target as Element | null;
      if (!target?.closest?.('.site-menu-panel, .site-more')) {
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
      <div
        className={`site-header-bar ${stacked ? 'is-stacked' : ''} ${
          showUserName ? 'has-user-name' : ''
        }`}
        ref={barRef}
        style={{ '--bar-zoom': barZoom } as React.CSSProperties}
      >
        <div className="site-header-left">
          <Brand site={site} />
        </div>

        {/* Phone only: the menu button, carrying the page one is on */}
        <button
          type="button"
          className={`site-more ${menuOpen ? 'is-open' : ''}`}
          aria-label={[
            current?.label,
            section === '' && tc('menu.hint'),
            tc('menu.allSections'),
          ]
            .filter(Boolean)
            .join(' – ')}
          aria-expanded={menuOpen}
          aria-controls="site-menu-panel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="site-more-label">
            {current?.label}
            {/* On the start page: a hint that this is the way around,
                shown only when the button has room for it (CSS) */}
            {section === '' && (
              <span className="site-more-hint" aria-hidden>
                {' – '}
                {tc('menu.hint')}
              </span>
            )}
          </span>
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
        >
          <SiteSearch site={site} openRef={openSearchRef} />
        </Nav>

        <div className="site-header-right">
          <NewButton site={site} />
          <EditButton />
          <GroupMembershipButton />
          <DiscussionButton />
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
          onSearch={() => {
            // The panel away first, so the field has the bar to itself
            flushSync(() => setMenuOpen(false));
            openSearchRef.current?.();
          }}
        />
      )}
    </header>
  );
}

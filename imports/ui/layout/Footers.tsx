import { Link } from 'react-router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { useAtomValue } from 'jotai';

import { locationsAtom } from '/imports/state';

import FeedbackForm from './FeedbackForm';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import ChangeLanguageMenu from './ChangeLanguageMenu';

export interface FooterProps {
  site: any;
}

// The foot of every page: the site's name and who it is for on the left,
// the municipality's mark on the right, on the woven season floor. The only
// place the municipality's logo appears, so the kinship with tranemo.se is
// said once, plainly.
export function Footer({ site }: FooterProps) {
  const prefix = useLocationPrefix();
  const locations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');

  if (!site || !site.settings) {
    return null;
  }

  const { settings } = site;
  const activeMenu = settings?.menu?.filter((item: any) => item.isVisible);
  const places = (locations || []).map((location) => location.name);
  const placesText =
    places.length > 1
      ? `${places.slice(0, -1).join(', ')} ${tc('footer.and')} ${places[places.length - 1]}`
      : places[0] || '';

  const routeFor = (item: any) =>
    item.name === 'info'
      ? `${prefix}/info/about`
      : item.isComposablePage
      ? `${prefix}/cp/${item.name}`
      : `${prefix}/${item.name}`;

  return (
    <footer className="site-footer vav">
      <div className="site-footer-inner">
        <div className="site-footer-text">
          <p className="site-footer-name">{settings.name}</p>
          {settings.footer ? (
            <div className="site-footer-byline text-content">
              {HTMLReactParser(DOMPurify.sanitize(settings.footer))}
            </div>
          ) : (
            <p className="site-footer-byline">
              {places.length > 0
                ? tc('footer.byline', { places: placesText })
                : tc('footer.bylineShort')}
            </p>
          )}

          <nav className="site-footer-nav" aria-label={tc('menu.label')}>
            {activeMenu?.map((item: any) => (
              <Link key={item.name} to={routeFor(item)}>
                {item.label}
              </Link>
            ))}
            <Link to="/terms-&-privacy-policy">
              <Trans i18nKey="common:terms.title">
                Terms of Service & Privacy Policy
              </Trans>
            </Link>
          </nav>

          <div className="site-footer-meta">
            {(settings.address || settings.city) && (
              <span>
                {[settings.address, settings.city].filter(Boolean).join(', ')}
              </span>
            )}
            {settings.email && <span>{settings.email}</span>}
          </div>

          <div className="site-footer-tools">
            <FeedbackForm />
            <ChangeLanguageMenu hideHelper />
          </div>
        </div>

        <a
          className="site-footer-mark"
          href="https://www.tranemo.se/"
          rel="noopener noreferrer"
          target="_blank"
        >
          <img alt="Tranemo kommun" src="/images/tranemo-kommun.svg" />
        </a>
      </div>
    </footer>
  );
}

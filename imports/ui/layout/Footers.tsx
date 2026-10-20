import { Link } from 'react-router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { useAtomValue } from 'jotai';
import InfoIcon from 'lucide-react/dist/esm/icons/info';
import LogInIcon from 'lucide-react/dist/esm/icons/log-in';

import { currentUserAtom, pageTitlesAtom } from '/imports/state';
import { isMenuItemShown } from '/imports/api/_utils/features';
import { parseTitle } from '/imports/api/_utils/shared';

import FeedbackForm from './FeedbackForm';
import LanguageSwitch from './LanguageSwitch';
import useLogout from './useLogout';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

export interface FooterProps {
  site: any;
}

// The foot of every page: the site's name and who made it on the left, the
// marks of the municipality, Uddebo Makerspace and Maskinrepubliken on the
// right, on the
// woven season floor. The only place the logos appear, so the kinship is
// said once, plainly.
export function Footer({ site }: FooterProps) {
  const prefix = useLocationPrefix();
  const pageTitles = useAtomValue(pageTitlesAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [tc] = useTranslation('common');
  const logout = useLogout();

  if (!site || !site.settings) {
    return null;
  }

  const { settings } = site;
  const activeMenu = settings?.menu?.filter(isMenuItemShown);
  const aboutPage = pageTitles?.[0];

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

          {/* The tools right under the name: language, about, feedback,
              and login last when logged out */}
          <div className="site-footer-tools">
            <LanguageSwitch />
            {aboutPage && (
              <Link
                className="site-footer-pill"
                to={`${prefix}/info/${parseTitle(aboutPage.title)}`}
              >
                <InfoIcon width={16} height={16} />
                {tc('footer.about')}
              </Link>
            )}
            <FeedbackForm />
            {!currentUser && (
              <Link className="site-footer-pill" to="/login">
                <LogInIcon width={16} height={16} />
                {tc('menu.guest.login')}
              </Link>
            )}
          </div>

          {currentUser && (
            <p className="site-footer-account">
              <Trans
                i18nKey="common:footer.signedInAs"
                values={{ name: currentUser.username }}
                components={{ me: <Link to="/admin/home" /> }}
              />{' '}
              <button
                type="button"
                className="site-footer-logout"
                onClick={logout}
              >
                {tc('actions.logout')}
              </button>
            </p>
          )}

          {settings.footer ? (
            <div className="site-footer-byline text-content">
              {HTMLReactParser(DOMPurify.sanitize(settings.footer))}
            </div>
          ) : (
            <p className="site-footer-byline">{tc('footer.byline')}</p>
          )}

          <nav className="site-footer-nav" aria-label={tc('menu.label')}>
            <Link to="/">{tc('menu.home')}</Link>
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
        </div>

        <div className="site-footer-marks">
          <a
            className="site-footer-mark"
            href="https://www.tranemo.se/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img alt="Tranemo kommun" src="/images/tranemo-kommun.svg" />
          </a>
          {/* The two who build it, on one card: Uddebo Makerspace's mark
              and under it Maskinrepubliken's wordmark, each a link (Uddebo
              Makerspace to its part of Maskinrepubliken's site) */}
          <div className="site-footer-mark site-footer-mark-makers">
            <a
              href="https://maskinrepubliken.se/#uddebomakerspace"
              rel="noopener noreferrer"
              target="_blank"
            >
              <img
                alt="Uddebo Makerspace"
                src="/images/uddebo-makerspace.png"
              />
            </a>
            <a
              href="https://maskinrepubliken.se/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <img alt="Maskinrepubliken" src="/images/maskinrepubliken.svg" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

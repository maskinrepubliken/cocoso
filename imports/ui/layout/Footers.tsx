import { Link } from 'react-router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { useAtomValue } from 'jotai';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';
import InfoIcon from 'lucide-react/dist/esm/icons/info';
import LogInIcon from 'lucide-react/dist/esm/icons/log-in';

import { currentUserAtom, pageTitlesAtom } from '/imports/state';
import { parseTitle } from '/imports/api/_utils/shared';
import { allLangs, rememberLang } from '/imports/startup/i18n';

import FeedbackForm from './FeedbackForm';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

export interface FooterProps {
  site: any;
}

// The language switch: a globe and the languages written out, the current
// one marked, so it reads as a choice and not as a form field.
function LanguageSwitch() {
  const { i18n, t: tc } = useTranslation('common');
  const current = i18n.language;
  const choose = (value: string) => {
    rememberLang(value);
    i18n.changeLanguage(value);
  };
  return (
    <div className="site-footer-langs" role="group" aria-label={tc('langs.label')}>
      <span className="site-footer-langs-icon" aria-hidden>
        <GlobeIcon width={16} height={16} />
      </span>
      {allLangs.map((lang) => (
        <button
          key={lang.value}
          type="button"
          className={`site-footer-lang ${current === lang.value ? 'is-active' : ''}`}
          aria-pressed={current === lang.value}
          lang={lang.value}
          onClick={() => choose(lang.value)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

// The foot of every page: the site's name and who made it on the left, the
// marks of the municipality and of Maskinrepubliken on the right, on the
// woven season floor. The only place the logos appear, so the kinship is
// said once, plainly.
export function Footer({ site }: FooterProps) {
  const prefix = useLocationPrefix();
  const pageTitles = useAtomValue(pageTitlesAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [tc] = useTranslation('common');

  if (!site || !site.settings) {
    return null;
  }

  const { settings } = site;
  const activeMenu = settings?.menu?.filter((item: any) => item.isVisible);
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
          <a
            className="site-footer-mark site-footer-mark-small"
            href="https://maskinrepubliken.se/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img alt="Maskinrepubliken" src="/images/maskinrepubliken.svg" />
          </a>
        </div>
      </div>
    </footer>
  );
}

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { pageTitlesAtom } from '/imports/state';
import { parseTitle } from '/imports/api/_utils/shared';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';

import FeedbackForm from './FeedbackForm';

// Remembered for a year; the notice's own cookie is one of the necessary
// ones it tells about.
const COOKIE = 'cocoso-cookie-notice';
const MAX_AGE = 60 * 60 * 24 * 365;

const hasSeen = () =>
  document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE}=`));

// Shown on a visitor's first visit: which cookies the site uses (only
// the necessary ones, so there is nothing to opt out of), that the
// service is in beta, and links to the about page, feedback and the
// terms. It stays on every page, the links included, until "Jag förstår"
// is pressed. Rendered only after mount, so the server's HTML never
// differs.
export default function CookieNotice() {
  const [tc] = useTranslation('common');
  const pageTitles = useAtomValue(pageTitlesAtom);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!hasSeen());
  }, []);

  if (!open) {
    return null;
  }

  const close = () => {
    document.cookie = `${COOKIE}=1; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
    setOpen(false);
  };

  const aboutPage = pageTitles?.[0];
  const aboutTo = aboutPage
    ? `/info/${parseTitle(aboutPage.title)}`
    : '/info/about';

  // Straight into <body>, so no wrapper's stacking or transform can hide it
  return createPortal(
    <section
      aria-labelledby="cookie-notice-title"
      className="cookie-notice"
      role="dialog"
    >
      <span className="cookie-notice-icon" aria-hidden="true">
        <ThreeDIcon name="lab" size={56} />
      </span>

      <div className="cookie-notice-body">
        <h2 id="cookie-notice-title" className="cookie-notice-title">
          {tc('cookies.title')}
        </h2>
        <p>{tc('cookies.text')}</p>
        <p>
          <strong className="cookie-notice-beta">{tc('home.hero.beta')}</strong>{' '}
          {tc('cookies.beta')}
        </p>

        <nav className="cookie-notice-links">
          <Link to={aboutTo}>{tc('footer.about')}</Link>
          <FeedbackForm
            trigger={(openFeedback) => (
              <button type="button" onClick={openFeedback}>
                {tc('modals.feedback.label')}
              </button>
            )}
          />
          <Link to="/terms-&-privacy-policy">{tc('terms.title')}</Link>
        </nav>
      </div>

      <button className="cookie-notice-ok" type="button" onClick={close}>
        {tc('cookies.ok')}
      </button>
    </section>,
    document.body
  );
}

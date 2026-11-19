import React from 'react';
import { Helmet } from 'react-helmet';
import { NavLink, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { siteAtom } from '/imports/state';
import NotFoundPage from '/imports/ui/pages/NotFoundPage';

import HelpProse, { type HelpSection } from './HelpProse';
import { HELP_GROUPS, findHelpPage, helpPath } from './helpPages';

export interface HelpPageProps {
  siteDoc?: any;
  group: 'about' | 'guide';
}

interface HelpPageText {
  title: string;
  lead?: string;
  updated?: string;
  sections: HelpSection[];
}

// The help section: every page under /about and /guide. The links to all
// of them on the left, the page one is reading on the right, like the admin
// panel; on a phone the links fold into "Innehåll" above the text. Decided
// by CSS, so the server and the browser write the same markup.
export default function HelpPage({ siteDoc, group }: HelpPageProps) {
  const siteFromAtom = useAtomValue(siteAtom);
  const site = siteDoc || siteFromAtom;
  const { helpSlug } = useParams();
  const [t] = useTranslation('help');

  const found = findHelpPage(group, helpSlug || '');
  if (!found) {
    return <NotFoundPage />;
  }

  const siteName = site?.settings?.name || '';
  const text = t(`pages.${found.page.key}`, {
    returnObjects: true,
    site: siteName,
  }) as HelpPageText;
  const current = helpPath(found.group, found.page);

  // The links are written twice (folded for a phone, beside the page
  // otherwise), so their headings' ids take the place's name
  const links = (place: string) =>
    HELP_GROUPS.map((g) => (
      <div className="help-nav-group" key={g.key}>
        <p className="help-nav-heading" id={`help-${place}-${g.key}`}>
          {t(`nav.groups.${g.key}`)}
        </p>
        <ul aria-labelledby={`help-${place}-${g.key}`}>
          {g.pages.map((page) => (
            <li key={page.key}>
              <NavLink className="help-nav-link" end to={helpPath(g, page)}>
                {t(`pages.${page.key}.title`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    ));

  return (
    <div className="help">
      <Helmet>
        {/* HelmetHybrid adds " | <site name>" */}
        <title>{String(text?.title || '')}</title>
        {text?.lead && <meta name="description" content={text.lead} />}
      </Helmet>

      {/* Phone: the same links, folded */}
      <details className="help-nav-folded" key={current}>
        <summary>{t('nav.contents')}</summary>
        <nav aria-label={t('nav.label')}>{links('folded')}</nav>
      </details>

      <nav className="help-nav" aria-label={t('nav.label')}>
        {links('nav')}
      </nav>

      <article className="help-page">
        <h1>{text?.title}</h1>
        {text?.lead && <p className="help-lead">{text.lead}</p>}
        <HelpProse sections={text?.sections} />
        {text?.updated && <p className="help-updated">{text.updated}</p>}
      </article>
    </div>
  );
}

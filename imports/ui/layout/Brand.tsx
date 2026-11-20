import React from 'react';
import { Link } from 'react-router';

import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import splitSiteName from '/imports/ui/utils/siteName';
import UserPopup from './UserPopup';

interface BrandProps {
  site: any;
}

// The brand pill: the logo mark and the site's name, set as in the start
// page hero, both leading home. When logged in, the account avatar sits
// between the two, overlapping the mark a little; it opens the account menu.
export default function Brand({ site }: BrandProps) {
  const settings = site?.settings;
  const [first, rest] = splitSiteName(settings);

  // Without an uploaded logo the mark is the crane (Tranemo's trana) on a
  // dark green disc, stepping a little outside it.
  const mark = site?.logo ? (
    <img alt="" className="site-brand-mark" src={site.logo} />
  ) : (
    <span className="site-brand-mark site-brand-mark-trana">
      {/* Always in view: loaded at once, never blank for a frame */}
      <ThreeDIcon name="trana-hals" size={40} decoding="sync" loading="eager" />
    </span>
  );

  return (
    <div className="site-brand">
      <Link className="site-brand-home" to="/" aria-label={settings?.name}>
        {mark}
      </Link>
      <UserPopup site={site} />
      {/* The same link once more, so the avatar can stand between mark and
          name; the mark's link is the one read out and tabbed to */}
      <Link className="site-brand-name" to="/" aria-hidden tabIndex={-1}>
        <span className="site-brand-name-full">
          {first}
          {rest && <span className="site-brand-name-rest">{rest}</span>}
        </span>
        {/* On the smallest screens the initials stand for the name, as it
            is written: "Tk" */}
        <span className="site-brand-name-short">
          {first.charAt(0)}
          {rest && (
            <span className="site-brand-name-rest">{rest.charAt(0)}</span>
          )}
        </span>
      </Link>
    </div>
  );
}

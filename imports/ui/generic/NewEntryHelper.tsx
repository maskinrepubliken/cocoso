import React from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import parseHtml from 'html-react-parser';
import { useAtomValue } from 'jotai';

import { siteAtom } from '../../state';
import ThreeDIcon from './ThreeDIcon';

export interface NewEntryHelperProps {
  buttonLabel?: string;
  buttonLink: string;
  children?: React.ReactNode;
  isEmptyListing?: boolean;
  small?: boolean;
  title?: string;
}

// The card that invites the next entry, at the end of a listing or alone
// when it is empty. A 3D icon makes an empty list a friendly start rather
// than a gap.
function NewEntryHelper({
  buttonLabel,
  buttonLink,
  isEmptyListing = false,
  small = false,
}: NewEntryHelperProps) {
  const site = useAtomValue(siteAtom);
  const location = useLocation();
  const [tc] = useTranslation('common');

  const activeMenuItem = site?.settings?.menu?.find((item: any) =>
    location?.pathname?.split('/').includes(item.name)
  );

  const titleGeneric = isEmptyListing
    ? parseHtml(tc('message.newentryhelper.emptylisting.title'))
    : parseHtml(
        tc('message.newentryhelper.title', { listing: activeMenuItem?.label })
      );

  const descriptionGeneric = isEmptyListing
    ? tc('message.newentryhelper.emptylisting.description')
    : tc('message.newentryhelper.description');

  const buttonLabelGeneric = buttonLabel || tc('message.newentryhelper.button');

  return (
    <Link
      className={`new-entry-helper ${small ? 'is-small' : ''}`}
      to={buttonLink}
    >
      <ThreeDIcon name="rocket" size={small ? 72 : 96} />
      <h3>{titleGeneric}</h3>
      <p>{descriptionGeneric}</p>
      <span className="new-entry-helper-button">{buttonLabelGeneric}</span>
    </Link>
  );
}
export default NewEntryHelper;

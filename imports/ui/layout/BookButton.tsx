import React from 'react';
import { Link, useMatches } from 'react-router';
import { useTranslation } from 'react-i18next';
import CalendarPlusIcon from 'lucide-react/dist/esm/icons/calendar-plus';
import { useAtomValue } from 'jotai';

import { isFeatureEnabled } from '/imports/api/_utils/features';
import { canCreateContentAtom } from '/imports/state';

// The calendar in the header, next to the gear: on a bookable place's page,
// for those who may create content while bookings are on, it opens a new
// booking in the calendar.
export default function BookButton() {
  const [tc] = useTranslation('common');
  const matches = useMatches();
  const canCreateContent = useAtomValue(canCreateContentAtom);

  if (!canCreateContent || !isFeatureEnabled('bookings')) {
    return null;
  }
  const data = [...matches].reverse().find((match) => match.data)?.data as
    | any
    | undefined;
  const resource = data?.resource;
  if (!resource?._id || !resource.isBookable) {
    return null;
  }

  const label = tc('labels.book');

  return (
    <div className="new-button-wrapper">
      <Link
        className="site-new-button"
        to={`/calendar?resourceId=${resource._id}&new=true`}
        aria-label={label}
        title={label}
      >
        <span className="site-new site-edit" aria-hidden>
          <CalendarPlusIcon width={16} height={16} />
        </span>
      </Link>
    </div>
  );
}

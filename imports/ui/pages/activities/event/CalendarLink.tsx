import React from 'react';
import { useTranslation } from 'react-i18next';
import CalendarPlusIcon from 'lucide-react/dist/esm/icons/calendar-plus';

import { styled } from '/stitches.config';
import type { Address } from '/imports/api/_utils/address';

import { Muted } from './Section';
import { calendarFileHref } from './calendarFile';
import { Occurrence, isPastOccurrence } from './occurrences';

const SmallLink = styled('a', {
  alignItems: 'center',
  alignSelf: 'flex-start',
  backgroundColor: 'var(--cocoso-papper)',
  border: '1.5px solid var(--cocoso-linje)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-700)',
  display: 'inline-flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.8rem',
  fontWeight: 700,
  gap: '0.4rem',
  height: '30px',
  padding: '0 0.75rem',
  textDecoration: 'none',
  '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-100)' },
  '& svg': { height: '0.95rem', width: '0.95rem' },
});

interface CalendarLinkProps {
  activity: {
    _id: string;
    title?: string;
    cancelledAt?: Date;
    resource?: string;
    place?: string;
    placeAddress?: Partial<Address> | null;
  };
  occurrence?: Occurrence | null;
  // The page's own address, for the calendar entry
  url: string;
}

// "Lägg till i kalendern": the chosen date as a file for one's own
// calendar, with the place, its address and a link back to the page.
export default function CalendarLink({
  activity,
  occurrence,
  url,
}: CalendarLinkProps) {
  const [tc] = useTranslation('common');

  if (!occurrence || activity.cancelledAt || isPastOccurrence(occurrence)) {
    return null;
  }

  const venue = activity.resource || activity.place;
  const { street, postalCode, city } = activity.placeAddress || {};
  const address = [street, [postalCode, city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <SmallLink
        download={`${(activity.title || 'event')
          .replace(/[^\p{L}\p{N}]+/gu, '-')
          .replace(/^-|-$/g, '')}.ics`}
        href={calendarFileHref({
          id: activity._id,
          title: activity.title,
          occurrence,
          location: [venue, address].filter(Boolean).join(', '),
          url,
        })}
      >
        <CalendarPlusIcon aria-hidden />
        {tc('event.cta.addToCalendar')}
      </SmallLink>
      <Muted>{tc('event.cta.addToCalendarHelp')}</Muted>
    </>
  );
}

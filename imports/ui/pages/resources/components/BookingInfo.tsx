import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import ExternalLinkIcon from 'lucide-react/dist/esm/icons/external-link';

import { styled } from '/stitches.config';
import { ContactDetails } from '/imports/ui/generic/ContactDetails';
import { hasContact, type Contact } from '/imports/api/_utils/contact';
import {
  PersonAvatar,
  personName,
} from '/imports/ui/pages/activities/form/PersonCard';

import type { Booking } from './BookingFields';

// As the server sends it: the organizer it is booked through, resolved
// (imports/api/resources/resource.booking.js)
export interface BookingWithPerson extends Booking {
  person?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
    publicContact?: Contact | null;
  } | null;
}

const Body = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  marginTop: '0.75rem',
});

const Info = styled('p', {
  lineHeight: 1.5,
  margin: 0,
  whiteSpace: 'pre-line',
});

const BookLink = styled('a', {
  alignItems: 'center',
  alignSelf: 'flex-start',
  backgroundColor: 'var(--cocoso-colors-theme-800)',
  borderRadius: '999px',
  color: 'white',
  display: 'inline-flex',
  fontWeight: 600,
  gap: '0.45rem',
  padding: '0.55rem 1.1rem',
  textDecoration: 'none',
  '& svg': { height: '1rem', width: '1rem' },
  '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-700)' },
});

const Person = styled(Link, {
  alignItems: 'center',
  color: 'inherit',
  display: 'flex',
  fontWeight: 600,
  gap: '0.6rem',
  textDecoration: 'none',
  '&:hover strong': { textDecoration: 'underline' },
});

// How to book the place: what to know, then a link to where it is booked
// or who to turn to.
export default function BookingInfo({
  booking,
  label,
}: {
  booking: BookingWithPerson;
  label?: string;
}) {
  const [tc] = useTranslation('common');
  const { person } = booking;
  const contact = booking.contact || person?.publicContact;

  return (
    <Body>
      {booking.info && <Info>{booking.info}</Info>}
      {booking.url && (
        <BookLink href={booking.url} rel="noopener noreferrer" target="_blank">
          {tc('entry.bookingLink')}
          <ExternalLinkIcon aria-hidden />
        </BookLink>
      )}
      {person && (
        <Person to={`/@${person.username}`}>
          <PersonAvatar person={person} size={32} />
          <strong>{personName(person)}</strong>
        </Person>
      )}
      {!booking.url && hasContact(contact) && (
        <ContactDetails contact={contact} subject={label} />
      )}
    </Body>
  );
}

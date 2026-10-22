import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import ArrowUpRightIcon from 'lucide-react/dist/esm/icons/arrow-up-right';

import { styled } from '/stitches.config';
import { ContactDetails } from '/imports/ui/generic/ContactDetails';
import {
  hasContact,
  websiteLabel,
  type Contact,
} from '/imports/api/_utils/contact';
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

// The way to book: a plain dark green button with "Boka här", where it leads
// and an arrow.
const BookLink = styled('a', {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-colors-theme-800)',
  borderRadius: '10px',
  color: 'white',
  display: 'flex',
  gap: '0.75rem',
  padding: '0.6rem 0.9rem',
  textDecoration: 'none',
  transition: 'background-color 0.15s ease',
  '& .book-arrow': {
    flex: 'none',
    height: '1.1rem',
    marginLeft: 'auto',
    width: '1.1rem',
  },
  '&:hover, &:focus-visible': {
    backgroundColor: 'var(--cocoso-colors-theme-700)',
  },
});

const BookText = styled('span', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.1rem',
  minWidth: 0,
  '& strong': {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  '& small': {
    fontSize: '0.8rem',
    opacity: 0.85,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
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
          <BookText>
            <strong>{tc('entry.bookingLink')}</strong>
            <small>{websiteLabel(booking.url)}</small>
          </BookText>
          <ArrowUpRightIcon aria-hidden className="book-arrow" />
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

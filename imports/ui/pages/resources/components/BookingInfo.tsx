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
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
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

// The way to book, as a card of its own in tegel: the calendar's 3D icon,
// "Boka här" and where it leads, and an arrow that moves on hover.
const BookLink = styled('a', {
  alignItems: 'center',
  background:
    'linear-gradient(135deg, var(--cocoso-tegel) 0%, var(--cocoso-tegel-600) 100%)',
  borderRadius: '14px',
  boxShadow: '0 10px 22px -12px rgba(150, 60, 20, 0.7)',
  color: 'white',
  display: 'flex',
  gap: '0.85rem',
  padding: '0.7rem 1rem 0.7rem 0.75rem',
  textDecoration: 'none',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  '& .threed-icon': {
    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))',
    flex: 'none',
    transition: 'transform 0.18s ease',
  },
  '& .book-arrow': {
    flex: 'none',
    height: '1.25rem',
    marginLeft: 'auto',
    transition: 'transform 0.18s ease',
    width: '1.25rem',
  },
  '&:hover, &:focus-visible': {
    boxShadow: '0 16px 28px -14px rgba(150, 60, 20, 0.8)',
    transform: 'translateY(-2px)',
  },
  '&:hover .threed-icon': { transform: 'rotate(-6deg) scale(1.06)' },
  '&:hover .book-arrow': { transform: 'translateX(3px)' },
});

const BookText = styled('span', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
  minWidth: 0,
  '& strong': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.2rem',
    fontWeight: 600,
    lineHeight: 1.1,
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
          <ThreeDIcon name="calendar" size={44} />
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

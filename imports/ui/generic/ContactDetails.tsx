import React from 'react';
import { useTranslation } from 'react-i18next';
import MailIcon from 'lucide-react/dist/esm/icons/mail';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';
import UserIcon from 'lucide-react/dist/esm/icons/user-round';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';

import { styled } from '/stitches.config';
import {
  Contact,
  hasContact,
  telHref,
  websiteLabel,
} from '/imports/api/_utils/contact';
import {
  Address,
  addressLines,
  hasAddress,
  mapUrl,
} from '/imports/api/_utils/address';

// The read-only side of imports/ui/forms/ContactFields and AddressFields:
// one icon per line, links where a line can be acted on.

export const DetailList = styled('ul', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  fontSize: '0.9rem',
  '& li': { alignItems: 'flex-start', display: 'flex', gap: '0.5rem' },
  '& svg': {
    color: 'var(--cocoso-tegel)',
    flexShrink: 0,
    height: '1rem',
    marginTop: '0.15rem',
    width: '1rem',
  },
  '& a': {
    color: 'var(--cocoso-colors-theme-700)',
    overflowWrap: 'anywhere',
  },
});

interface ContactDetailsProps {
  contact?: Contact | null;
  // Subject line for the mailto link, e.g. the event's title.
  subject?: string;
}

// Name, email, phone and website, in that order.
export function ContactDetails({ contact, subject }: ContactDetailsProps) {
  if (!contact || !hasContact(contact)) {
    return null;
  }
  const mailto = subject
    ? `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${contact.email}`;
  return (
    <DetailList>
      {contact.name && (
        <li>
          <UserIcon aria-hidden />
          <span>{contact.name}</span>
        </li>
      )}
      {contact.email && (
        <li>
          <MailIcon aria-hidden />
          <a href={mailto}>{contact.email}</a>
        </li>
      )}
      {contact.phone && (
        <li>
          <PhoneIcon aria-hidden />
          <a href={telHref(contact.phone)}>{contact.phone}</a>
        </li>
      )}
      {contact.website && (
        <li>
          <GlobeIcon aria-hidden />
          <a href={contact.website} rel="noopener noreferrer" target="_blank">
            {websiteLabel(contact.website)}
          </a>
        </li>
      )}
    </DetailList>
  );
}

interface AddressDetailsProps {
  address?: Partial<Address> | null;
  // Shown without a link to the map, e.g. inside a card.
  withoutMapLink?: boolean;
}

// The address as on an envelope, and a link to it on the map.
export function AddressDetails({ address, withoutMapLink }: AddressDetailsProps) {
  const [tc] = useTranslation('common');
  if (!address || !hasAddress(address)) {
    return null;
  }
  const lines = addressLines(address);
  const href = withoutMapLink ? null : mapUrl(address);
  return (
    <DetailList>
      <li>
        <MapPinIcon aria-hidden />
        <span>
          {lines.map((line, i) => (
            <React.Fragment key={line}>
              {i > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
          {href && (
            <>
              {lines.length > 0 && <br />}
              <a href={href} rel="noopener noreferrer" target="_blank">
                {tc('address.showOnMap')}
              </a>
            </>
          )}
        </span>
      </li>
    </DetailList>
  );
}

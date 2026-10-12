import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import MailIcon from 'lucide-react/dist/esm/icons/mail';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';

import { styled } from '/stitches.config';
import { Avatar, Button } from '/imports/ui/core';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

import Section, { Muted } from './Section';

const List = styled('ul', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const Row = styled(Link, {
  alignItems: 'center',
  color: 'inherit',
  display: 'flex',
  gap: '0.875rem',
  textDecoration: 'none',
  '&:hover strong': { textDecoration: 'underline' },
});

const Name = styled('strong', {
  display: 'block',
  fontSize: '1.05rem',
});

const ContactList = styled('ul', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  listStyle: 'none',
  margin: '0.5rem 0 0',
  padding: 0,
  fontSize: '0.9rem',
  '& li': { alignItems: 'center', display: 'flex', gap: '0.5rem' },
  '& svg': {
    color: 'var(--cocoso-tegel)',
    flexShrink: 0,
    height: '1rem',
    width: '1rem',
  },
  '& a': {
    color: 'var(--cocoso-colors-theme-700)',
    overflowWrap: 'anywhere',
  },
  variants: {
    indented: { true: { paddingLeft: 'calc(48px + 0.875rem)' } },
  },
});

const EventContact = styled('div', {
  borderTop: '1px solid var(--cocoso-colors-theme-100)',
  marginTop: '1rem',
  paddingTop: '0.875rem',
});

const Actions = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '1rem',
});

export interface PublicContact {
  email?: string;
  phone?: string;
  website?: string;
}

export interface OrganizerProfile {
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: { src?: string };
  publicContact?: PublicContact | null;
}

interface OrganizerSectionProps {
  activity: {
    _id: string;
    title?: string;
    authorName: string;
    contact?: PublicContact | null;
    organizerProfiles?: OrganizerProfile[];
  };
}

const hasAny = (contact?: PublicContact | null) =>
  Boolean(contact && (contact.email || contact.phone || contact.website));

const websiteLabel = (url: string) =>
  url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

// Email, phone and website as links, in that order.
function ContactRows({
  contact,
  subject,
  indented,
}: {
  contact: PublicContact;
  subject: string;
  indented?: boolean;
}) {
  return (
    <ContactList indented={indented}>
      {contact.email && (
        <li>
          <MailIcon aria-hidden />
          <a href={`mailto:${contact.email}?subject=${subject}`}>
            {contact.email}
          </a>
        </li>
      )}
      {contact.phone && (
        <li>
          <PhoneIcon aria-hidden />
          <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>
            {contact.phone}
          </a>
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
    </ContactList>
  );
}

// Who runs the event and how to reach them: every organizer with their
// public contact details, the event's own contact if it has one, and a
// way to write to the organizer about this event in particular.
export default function OrganizerSection({ activity }: OrganizerSectionProps) {
  const [tc] = useTranslation('common');

  const organizers: OrganizerProfile[] =
    activity.organizerProfiles && activity.organizerProfiles.length > 0
      ? activity.organizerProfiles
      : [{ userId: '', username: activity.authorName }];
  const several = organizers.length > 1;
  const subject = encodeURIComponent(activity.title || '');

  // Where "write to the organizer" goes: the event's own address first,
  // otherwise the first organizer who gave one.
  const mailTo =
    activity.contact?.email ||
    organizers.find((o) => o.publicContact?.email)?.publicContact?.email;

  return (
    <Section
      order={6}
      title={tc(several ? 'event.sections.organizers' : 'event.sections.organizer')}
    >
      <List>
        {organizers.map((organizer) => {
          const fullName = [organizer.firstName, organizer.lastName]
            .filter(Boolean)
            .join(' ');
          const displayName = fullName || organizer.username;
          return (
            <li key={organizer.userId || organizer.username}>
              <Row to={`/@${organizer.username}`}>
                <Avatar
                  name={displayName}
                  size="lg"
                  src={getImageUrl(organizer.avatar?.src, 'thumb')}
                />
                <span>
                  <Name>{displayName}</Name>
                  <Muted>@{organizer.username}</Muted>
                </span>
              </Row>
              {hasAny(organizer.publicContact) && (
                <ContactRows
                  contact={organizer.publicContact!}
                  indented
                  subject={subject}
                />
              )}
            </li>
          );
        })}
      </List>

      {hasAny(activity.contact) && (
        <EventContact>
          <Muted>{tc('event.organizer.eventContact')}</Muted>
          <ContactRows contact={activity.contact!} subject={subject} />
        </EventContact>
      )}

      {!mailTo && !hasAny(activity.contact) && (
        <Muted css={{ marginTop: '0.75rem' }}>
          {tc('event.organizer.noContact')}
        </Muted>
      )}

      <Actions>
        {mailTo && (
          <Button
            leftIcon={<MailIcon />}
            size="sm"
            onClick={() => {
              window.location.href = `mailto:${mailTo}?subject=${subject}`;
            }}
          >
            {tc('event.organizer.write')}
          </Button>
        )}
      </Actions>
    </Section>
  );
}

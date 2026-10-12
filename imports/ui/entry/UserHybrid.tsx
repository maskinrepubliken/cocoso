import { Outlet, useLocation, useParams, useRevalidator } from 'react-router';
import React, { useEffect, useState } from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import MailIcon from 'lucide-react/dist/esm/icons/mail';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';

import { styled } from '/stitches.config';
import { Alert, Box, Center, Flex, Text } from '/imports/ui/core';
import useOpenEntry from '/imports/ui/listing/useOpenEntry';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import { displayName } from '/imports/ui/listing/UsersHybrid';
import Tabs from '/imports/ui/core/Tabs';
import { currentUserAtom, locationsAtom, roleAtom } from '/imports/state';
import type { Site } from '/imports/ui/types';

import EntryHero, {
  Actions,
  Chip,
  EntryColumn,
  EntryMeta,
  EntryPage,
  EntryTopBar,
  PillLink,
  RoundPicture,
  SectionHead,
  plainText,
} from './EntryHero';

interface UserBio {
  bio?: string;
}

interface BioProps {
  user?: UserBio | null;
}

export function Bio({ user }: BioProps) {
  if (!user || !user.bio) {
    return null;
  }

  return (
    <Flex justify="center" mb="4">
      <Box
        className="text-content"
        p="4"
        w="100%"
        css={{
          backgroundColor: 'var(--cocoso-papper)',
          borderLeft: '4px solid var(--cocoso-tegel)',
          borderRadius: 'var(--cocoso-radius-kort)',
          boxShadow: 'var(--cocoso-skugga)',
          maxWidth: '480px',
        }}
      >
        {HTMLReactParser(DOMPurify.sanitize(user.bio))}
      </Box>
    </Flex>
  );
}

interface PublicContact {
  email?: string;
  phone?: string;
  website?: string;
}

const EventCards = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
});

// The ways to reach them they chose to make public.
function ContactLinks({ contact }: { contact?: PublicContact | null }) {
  const [tc] = useTranslation('common');
  if (!contact || !(contact.email || contact.phone || contact.website)) {
    return null;
  }
  return (
    <Actions>
      {contact.email && (
        <PillLink
          href={`mailto:${contact.email}`}
          primary
          title={tc('people.email')}
        >
          <MailIcon aria-hidden />
          {contact.email}
        </PillLink>
      )}
      {contact.phone && (
        <PillLink href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>
          <PhoneIcon aria-hidden />
          {contact.phone}
        </PillLink>
      )}
      {contact.website && (
        <PillLink
          href={contact.website}
          rel="noopener noreferrer"
          target="_blank"
          title={tc('people.website')}
        >
          <GlobeIcon aria-hidden />
          {contact.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
        </PillLink>
      )}
    </Actions>
  );
}
interface Events {
  upcoming: any[];
  past: any[];
  // Only filled for the person themself and admins.
  archived?: any[];
}

type EventsView = 'past' | 'upcoming' | 'archived';

interface OrganizerEventsProps {
  events?: Events;
  name?: string;
}

// Everything they organize, upcoming first, shown like the events listing.
function OrganizerEvents({ events, name }: OrganizerEventsProps) {
  const [tc] = useTranslation('common');
  const locations = useAtomValue(locationsAtom);
  const upcoming = events?.upcoming || [];
  const past = events?.past || [];
  const archived = events?.archived || [];
  const [view, setView] = useState<EventsView>(
    upcoming.length === 0 && past.length > 0 ? 'past' : 'upcoming'
  );
  const openEntry = useOpenEntry('activities');

  if (upcoming.length === 0 && past.length === 0 && archived.length === 0) {
    return (
      <Center p="4" mb="12">
        <Text color="gray.600">{tc('people.noEvents', { username: name })}</Text>
      </Center>
    );
  }

  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name ||
    (item.isMunicipalityOnly ? tc('locations.municipalityOnlyShort') : null);

  const tabs = [
    {
      key: 'past',
      title: tc('labels.past'),
      onClick: () => setView('past'),
    },
    {
      key: 'upcoming',
      title: tc('labels.upcoming'),
      onClick: () => setView('upcoming'),
    },
    ...(archived.length > 0
      ? [
          {
            key: 'archived',
            title: tc('labels.archived'),
            onClick: () => setView('archived'),
          },
        ]
      : []),
  ];

  const items =
    view === 'past' ? past : view === 'archived' ? archived : upcoming;
  const showPast = view !== 'upcoming';
  const tabIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === view)
  );

  return (
    <EntryColumn>
      <SectionHead>
        <h2>{tc('people.events')}</h2>
        <Tabs tabs={tabs} index={tabIndex} />
      </SectionHead>

      {view === 'archived' && (
        <Center mb="4" px="2">
          <Alert message={tc('event.archived.onlyYou')} type="info" />
        </Center>
      )}

      <EventCards>
        {items.map((item, index) => (
          <Box
            key={item._id}
            css={{ cursor: 'pointer' }}
            onClick={() => openEntry(item)}
          >
            <SexyThumb
              activity={item}
              index={index}
              showPast={showPast}
              tags={[locationNameOf(item)].filter(Boolean) as string[]}
            />
          </Box>
        ))}
      </EventCards>
    </EntryColumn>
  );
}

interface User {
  _id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: { src?: string };
  keywords?: Array<{ keywordLabel?: string }>;
  memberships?: Array<{ isOrganizer?: boolean }>;
  publicContact?: PublicContact | null;
}

export interface UserHybridProps {
  events?: Events;
  user: User | null;
  siteDoc: Site;
}

// An organizer's page: a card with their picture, who they are and how to
// reach them, then the events they organize.
export default function UserHybrid({ events, user, siteDoc }: UserHybridProps) {
  const { workId } = useParams<{ workId?: string }>();
  const { pathname } = useLocation();
  const [tc] = useTranslation('common');
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const revalidator = useRevalidator();

  // The server renders the page for an anonymous visitor, without the
  // archived events; fetch again once we know this is the person or an admin.
  const seesArchived = Boolean(
    user && currentUser && (role === 'admin' || currentUser._id === user._id)
  );
  useEffect(() => {
    if (seesArchived) {
      revalidator.revalidate();
    }
  }, [seesArchived, user?._id]);

  if (!user) {
    return (
      <Center p="8">
        <Alert
          message={
            <Trans i18nKey="accounts:profile.message.notfound">
              User with this username within this organization not found, or
              chose to hide their profile
            </Trans>
          }
        />
      </Center>
    );
  }

  if (workId) {
    return <Outlet />;
  }

  const menu = siteDoc?.settings?.menu;
  const people = menu?.find((item) => item.name === 'people');
  const isOrganizer = user.memberships?.some((m) => m.isOrganizer);
  const name = displayName(user);
  const keywords = (user.keywords?.map((k) => k.keywordLabel) || []).filter(
    Boolean
  ) as string[];
  const upcomingCount = events?.upcoming?.length || 0;

  // Groups and works still have their own pages under the profile.
  const showsSubPage = ['groups', 'works'].some((segment) =>
    pathname.split('/').includes(segment)
  );

  return (
    <EntryPage>
      <EntryMeta
        description={plainText(user.bio)}
        image={user.avatar?.src}
        path={`/@${user.username}`}
        title={name}
        type="profile"
      />

      <EntryTopBar
        backLink={
          people?.isVisible
            ? { label: people.label, value: '/people' }
            : undefined
        }
      />

      <EntryHero
        chips={
          isOrganizer || keywords.length > 0 ? (
            <>
              {isOrganizer && <Chip accent>{tc('people.organizer')}</Chip>}
              {keywords.map((keyword) => (
                <Chip key={keyword}>{keyword}</Chip>
              ))}
            </>
          ) : null
        }
        html={user.bio}
        meta={
          upcomingCount > 0 ? (
            <span>{tc('people.upcoming', { count: upcomingCount })}</span>
          ) : null
        }
        picture={
          <RoundPicture
            alt={name}
            seed={user._id || user.username}
            src={user.avatar?.src}
          />
        }
        title={name}
      >
        <ContactLinks contact={user.publicContact} />
      </EntryHero>

      {showsSubPage ? (
        <Center mb="12">
          <Box css={{ maxWidth: '600px' }} w="100%">
            <Outlet />
          </Box>
        </Center>
      ) : (
        <OrganizerEvents events={events} name={name} />
      )}
    </EntryPage>
  );
}

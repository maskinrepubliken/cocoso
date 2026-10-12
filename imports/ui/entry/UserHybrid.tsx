import { Outlet, useLocation, useParams, useRevalidator } from 'react-router';
import React, { useEffect, useState } from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Helmet } from 'react-helmet';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import MailIcon from 'lucide-react/dist/esm/icons/mail';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';

import { styled } from '/stitches.config';
import { Alert, Box, Button, Center, Flex, Text } from '/imports/ui/core';
import { publicUrl } from '/imports/api/_utils/shared';
import useOpenEntry from '/imports/ui/listing/useOpenEntry';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import { displayName } from '/imports/ui/listing/UsersHybrid';
import Tabs from '/imports/ui/core/Tabs';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import { getImageUrl, getImageUrlBest } from '/imports/ui/utils/imageHelper';
import { currentUserAtom, locationsAtom, roleAtom } from '/imports/state';
import type { Site } from '/imports/ui/types';

import BackLink from './BackLink';

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

const WIDE = '@media (min-width: 760px)';

const Page = styled('div', {
  boxSizing: 'border-box',
  margin: '0 auto',
  maxWidth: '1180px',
  padding: '0 1rem 3rem',
  width: '100%',
});

const TopBar = styled('div', {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
});

// The top of the page: the portrait on a band of the site's green, and
// beside it who they are, what they do and how to reach them.
const Hero = styled('header', {
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: '20px',
  boxShadow: 'var(--cocoso-skugga)',
  display: 'grid',
  margin: '0 auto 2rem',
  maxWidth: '980px',
  overflow: 'hidden',
  [WIDE]: { gridTemplateColumns: '280px minmax(0, 1fr)' },
});

const PortraitBand = styled('div', {
  alignItems: 'center',
  background:
    'linear-gradient(160deg, var(--cocoso-colors-theme-100), var(--cocoso-colors-theme-200))',
  display: 'flex',
  justifyContent: 'center',
  padding: '1.75rem 1rem',
  [WIDE]: { padding: '2rem 1.5rem' },
});

const Portrait = styled('div', {
  aspectRatio: '1 / 1',
  background: 'var(--cocoso-colors-theme-700)',
  borderRadius: '50%',
  boxShadow: '0 14px 30px -18px rgba(20, 50, 20, 0.7)',
  overflow: 'hidden',
  padding: '5px',
  width: '160px',
  [WIDE]: { width: '210px' },
  '& > *': {
    borderRadius: '50%',
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    overflow: 'hidden',
    width: '100%',
  },
});

const About = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  padding: '1.5rem 1.25rem 1.75rem',
  [WIDE]: { padding: '2rem 2.25rem 2.25rem' },
});

const Chips = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.4rem',
});

const Chip = styled('span', {
  border: '1px solid currentColor',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  padding: '0.15rem 0.65rem',
  variants: {
    accent: {
      true: {
        backgroundColor: 'var(--cocoso-tegel)',
        borderColor: 'var(--cocoso-tegel)',
        color: 'white',
      },
    },
  },
});

const Name = styled('h1', {
  fontFamily: 'var(--cocoso-font-display)',
  fontSize: '2rem',
  fontVariationSettings: '"SOFT" 60',
  fontWeight: 600,
  lineHeight: 1.1,
  margin: 0,
  [WIDE]: { fontSize: '2.5rem' },
});

const Count = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.95rem',
  margin: 0,
});

const BioText = styled('div', {
  lineHeight: 1.6,
  maxWidth: '62ch',
  '& p': { margin: '0 0 0.6rem' },
  '& p:last-child': { marginBottom: 0 },
  '& em': { color: 'var(--cocoso-mylla-soft)', fontSize: '0.82rem' },
});

const Contacts = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '0.25rem',
});

const ContactLink = styled('a', {
  alignItems: 'center',
  border: '1.5px solid var(--cocoso-colors-theme-800)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'inline-flex',
  fontSize: '0.92rem',
  fontWeight: 600,
  gap: '0.45rem',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  padding: '0.45rem 0.95rem',
  textDecoration: 'none',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  '& svg': { flexShrink: 0, height: '1rem', width: '1rem' },
  '&:hover': {
    backgroundColor: 'var(--cocoso-colors-theme-800)',
    color: 'white',
  },
  variants: {
    primary: {
      true: {
        backgroundColor: 'var(--cocoso-colors-theme-800)',
        color: 'white',
        '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-900)' },
      },
    },
  },
});

// The events sit in a column as wide as the card above them.
const EventsColumn = styled('section', {
  margin: '0 auto 3rem',
  maxWidth: '980px',
});

const EventCards = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
});

const EventsHead = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem 1.5rem',
  justifyContent: 'space-between',
  marginBottom: '1rem',
  '& h2': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.6rem',
    fontVariationSettings: '"SOFT" 60',
    fontWeight: 600,
    margin: 0,
  },
});

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      leftIcon={<LinkIcon />}
      size="lg"
      variant="ghost"
      css={{ fontWeight: 'normal' }}
      onClick={copy}
    >
      {copied ? (
        <Trans i18nKey="actions.copied" ns="common" />
      ) : (
        <Trans i18nKey="actions.share" ns="common" />
      )}
    </Button>
  );
}

// The ways to reach them they chose to make public.
function ContactLinks({ contact }: { contact?: PublicContact | null }) {
  const [tc] = useTranslation('common');
  if (!contact || !(contact.email || contact.phone || contact.website)) {
    return null;
  }
  return (
    <Contacts>
      {contact.email && (
        <ContactLink
          href={`mailto:${contact.email}`}
          primary
          title={tc('people.email')}
        >
          <MailIcon aria-hidden />
          {contact.email}
        </ContactLink>
      )}
      {contact.phone && (
        <ContactLink href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>
          <PhoneIcon aria-hidden />
          {contact.phone}
        </ContactLink>
      )}
      {contact.website && (
        <ContactLink
          href={contact.website}
          rel="noopener noreferrer"
          target="_blank"
          title={tc('people.website')}
        >
          <GlobeIcon aria-hidden />
          {contact.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
        </ContactLink>
      )}
    </Contacts>
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
    <EventsColumn>
      <EventsHead>
        <h2>{tc('people.events')}</h2>
        <Tabs tabs={tabs} index={tabIndex} />
      </EventsHead>

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
    </EventsColumn>
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
  const avatar = getImageUrl(user.avatar?.src, 'medium') || user.avatar?.src;
  const url = publicUrl(`/@${user.username}`);
  const description = (user.bio || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const shareImage = getImageUrlBest(user.avatar?.src);

  // Groups and works still have their own pages under the profile.
  const showsSubPage = ['groups', 'works'].some((segment) =>
    pathname.split('/').includes(segment)
  );

  return (
    <Page>
      <Helmet>
        <title>{name}</title>
        <meta name="title" content={name} />
        <meta name="description" content={description} />
        <meta property="og:title" content={name?.substring(0, 40)} />
        <meta property="og:url" content={url} />
        <meta
          property="og:image"
          content={shareImage || publicUrl('/images/og-default.jpg')}
        />
        <meta
          property="og:description"
          content={description.substring(0, 150)}
        />
        <meta property="og:type" content="profile" />
      </Helmet>

      <TopBar>
        <BackLink
          backLink={
            people?.isVisible
              ? { label: people.label, value: '/people' }
              : undefined
          }
        />
        <ShareButton />
      </TopBar>

      <Hero>
        <PortraitBand>
          <Portrait>
            {avatar ? (
              <img alt={name} src={avatar} />
            ) : (
              <PlaceholderImage seed={user._id || user.username} />
            )}
          </Portrait>
        </PortraitBand>

        <About>
          {(isOrganizer || keywords.length > 0) && (
            <Chips>
              {isOrganizer && <Chip accent>{tc('people.organizer')}</Chip>}
              {keywords.map((keyword) => (
                <Chip key={keyword}>{keyword}</Chip>
              ))}
            </Chips>
          )}
          <Name>{name}</Name>
          {upcomingCount > 0 && (
            <Count>{tc('people.upcoming', { count: upcomingCount })}</Count>
          )}
          {user.bio && (
            <BioText className="text-content">
              {HTMLReactParser(DOMPurify.sanitize(user.bio))}
            </BioText>
          )}
          <ContactLinks contact={user.publicContact} />
        </About>
      </Hero>

      {showsSubPage ? (
        <Center mb="12">
          <Box css={{ maxWidth: '600px' }} w="100%">
            <Outlet />
          </Box>
        </Center>
      ) : (
        <OrganizerEvents events={events} name={name} />
      )}
    </Page>
  );
}

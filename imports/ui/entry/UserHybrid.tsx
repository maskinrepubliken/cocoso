import { Outlet, useLocation, useParams, useRevalidator } from 'react-router';
import React, { useEffect, useState } from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Alert, Box, Center, Flex, Text } from '/imports/ui/core';
import { publicUrl } from '/imports/api/_utils/shared';
import useOpenEntry from '/imports/ui/listing/useOpenEntry';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import { displayName } from '/imports/ui/listing/UsersHybrid';
import Tabs from '/imports/ui/core/Tabs';
import { currentUserAtom, locationsAtom, roleAtom } from '/imports/state';
import type { Site } from '/imports/ui/types';

import TablyCentered from './TablyCentered';

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

interface Events {
  upcoming: any[];
  past: any[];
  // Only filled for the person themself and admins.
  archived?: any[];
}

type EventsView = 'past' | 'upcoming' | 'archived';

interface OrganizerEventsProps {
  events?: Events;
  username?: string;
}

// Everything the person organizes, upcoming first, shown like the events
// listing.
function OrganizerEvents({ events, username }: OrganizerEventsProps) {
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
        <Text color="gray.600">{tc('people.noEvents', { username })}</Text>
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
    <Box mb="12">
      <Center mb="4">
        <Tabs tabs={tabs} index={tabIndex} />
      </Center>

      {view === 'archived' && (
        <Center mb="4" px="2">
          <Alert message={tc('event.archived.onlyYou')} type="info" />
        </Center>
      )}

      <Flex justify="center" wrap="wrap" gap="4" px="2">
        {items.map((item, index) => (
          <Center
            key={item._id}
            flex="0 1 290px"
            css={{ alignSelf: 'stretch', cursor: 'pointer' }}
            onClick={() => openEntry(item)}
          >
            <SexyThumb
              activity={item}
              index={index}
              showPast={showPast}
              tags={[locationNameOf(item)].filter(Boolean) as string[]}
            />
          </Center>
        ))}
      </Flex>
    </Box>
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
}

export interface UserHybridProps {
  events?: Events;
  user: User | null;
  siteDoc: Site;
}

// A person's page, laid out like a place or an event: header, picture and
// bio, then the events they organize.
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

  const tags = [
    isOrganizer ? tc('people.organizer') : null,
    ...(user.keywords?.map((k) => k.keywordLabel) || []),
  ].filter(Boolean) as string[];

  // Groups and works still have their own pages under the profile.
  const showsSubPage = ['groups', 'works'].some((segment) =>
    pathname.split('/').includes(segment)
  );

  return (
    <TablyCentered
      backLink={
        people?.isVisible
          ? { label: people.label, value: '/people' }
          : undefined
      }
      images={[user.avatar?.src]}
      placeholderSeed={user._id || user.username}
      subTitle={name !== user.username ? `@${user.username}` : undefined}
      tags={tags}
      title={name}
      url={publicUrl(`/@${user.username}`)}
    >
      <Bio user={user} />
      {showsSubPage ? (
        <Center mb="12">
          <Box css={{ maxWidth: '600px' }} w="100%">
            <Outlet />
          </Box>
        </Center>
      ) : (
        <OrganizerEvents events={events} username={user.username} />
      )}
    </TablyCentered>
  );
}

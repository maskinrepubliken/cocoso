import { Outlet, useLocation, useParams } from 'react-router';
import React, { useState } from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Alert, Box, Center, Flex, Text } from '/imports/ui/core';
import { publicUrl } from '/imports/api/_utils/shared';
import PopupHandler from '/imports/ui/listing/PopupHandler';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import { displayName } from '/imports/ui/listing/UsersHybrid';
import Tabs from '/imports/ui/core/Tabs';
import { locationsAtom } from '/imports/state';
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
        bg="white"
        className="text-content"
        p="4"
        w="100%"
        css={{
          borderColor: 'var(--cocoso-colors-theme-500)',
          borderLeft: '4px solid',
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
}

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
  const [showPast, setShowPast] = useState(
    upcoming.length === 0 && past.length > 0
  );
  const [modalItem, setModalItem] = useState(null);

  if (upcoming.length === 0 && past.length === 0) {
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
      onClick: () => setShowPast(true),
    },
    {
      key: 'upcoming',
      title: tc('labels.upcoming'),
      onClick: () => setShowPast(false),
    },
  ];

  const items = showPast ? past : upcoming;

  return (
    <Box mb="12">
      <Center mb="4">
        <Tabs tabs={tabs} index={showPast ? 0 : 1} />
      </Center>

      <Flex justify="center" wrap="wrap" gap="4" px="2">
        {items.map((item, index) => (
          <Center
            key={item._id}
            flex="0 1 355px"
            css={{ cursor: 'pointer' }}
            onClick={() => setModalItem(item)}
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

      <PopupHandler
        item={modalItem}
        kind="activities"
        showPast={showPast}
        onClose={() => setModalItem(null)}
      />
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

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import Select from 'react-select';
import CalendarDaysIcon from 'lucide-react/dist/esm/icons/calendar-days';

import { styled } from '/stitches.config';
import { Box, Center, Text } from '/imports/ui/core';
import { siteAtom } from '/imports/state';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

import PageHeading from './PageHeading';
import PlaceholderImage from '../generic/PlaceholderImage';

export interface UsersHybridProps {
  siteDoc: any;
  users: any[];
  keywords?: any[];
}

// A person's name, or their username when they have not given one.
export const displayName = (user: any) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username;

// An organizer as a round portrait with the name below.
const Person = styled(Link, {
  alignItems: 'center',
  color: 'inherit',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  textAlign: 'center',
  textDecoration: 'none',
  width: '200px',
  '&:hover .portrait': { transform: 'translateY(-3px)' },
  '&:hover strong': { textDecoration: 'underline' },
  '& strong': { display: 'block', fontSize: '1.05rem' },
  // Three in a row on a phone, with a little slack so rounding never
  // pushes the third one down
  '@media (max-width: 720px)': {
    flex: '0 0 calc(33.333% - 0.6rem)',
    width: 'auto',
    gap: '0.4rem',
    '& strong': { fontSize: '0.85rem', lineHeight: 1.2 },
  },
});

// The ring holds the photo.
const Ring = styled('div', {
  position: 'relative',
  width: '100%',
});

// The photo with a plain dark green border and the site's soft shadow.
// The disc behind the photo is the border's own green, so the hairline
// the browser leaves between the two circles never shows pale.
const Portrait = styled('div', {
  aspectRatio: '1 / 1',
  background: 'var(--cocoso-colors-theme-700)',
  border: '5px solid var(--cocoso-colors-theme-700)',
  borderRadius: '50%',
  boxShadow: 'var(--cocoso-skugga)',
  boxSizing: 'border-box',
  overflow: 'hidden',
  padding: 0,
  transition: 'transform 0.2s ease',
  width: '100%',
  '& > *': {
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    overflow: 'hidden',
    width: '100%',
  },
});

// "8 kommande" under the name: how many events are ahead, as a quiet
// line in the site's green rather than a red badge on the photo (which
// read like an unread-notification count).
const Upcoming = styled('span', {
  alignItems: 'center',
  color: 'var(--cocoso-colors-theme-700)',
  display: 'inline-flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.82rem',
  fontWeight: 600,
  gap: '0.3rem',
  marginTop: '-0.35rem',
  '& svg': { flexShrink: 0, height: '0.95rem', width: '0.95rem' },
  '@media (max-width: 720px)': {
    fontSize: '0.72rem',
    marginTop: '-0.2rem',
    '& svg': { height: '0.8rem', width: '0.8rem' },
  },
});

export const People = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2rem 2.5rem',
  justifyContent: 'center',
  padding: '1rem 0.5rem 3rem',
  '@media (max-width: 720px)': {
    gap: '1.25rem 0.75rem',
    padding: '0.5rem 0 2rem',
  },
});

// The organizers as round portraits. A portrait goes straight to the
// person's page, where their events are listed.
// An organizer as on the organizers page: the portrait in its green ring,
// the name below and under it how many events are ahead. Also used by the
// search results page.
export function PersonTile({ user }: { user: any }) {
  const [tc] = useTranslation('common');
  const avatar = getImageUrl(user.avatar?.src || user.avatar, 'small');
  const name = displayName(user);
  return (
    <Person to={`/@${user.username}`}>
      <Ring>
        <Portrait className="portrait">
          {avatar ? (
            <img alt="" loading="lazy" src={avatar} />
          ) : (
            <PlaceholderImage seed={user._id || user.username} />
          )}
        </Portrait>
      </Ring>
      <strong>{name}</strong>
      {user.upcomingCount > 0 && (
        <Upcoming title={tc('people.upcoming', { count: user.upcomingCount })}>
          <CalendarDaysIcon aria-hidden />
          {tc('people.upcomingShort', { count: user.upcomingCount })}
        </Upcoming>
      )}
    </Person>
  );
}

export default function UsersHybrid({
  siteDoc,
  users,
  keywords,
}: UsersHybridProps) {
  const site = useAtomValue(siteAtom);
  const [selectedKeywords, setSelectedKeywords] = useState<any[]>([]);
  const [tc] = useTranslation('common');

  const keywordsUsed = useMemo(
    () =>
      keywords
        ? keywords.filter((kw) =>
            users.some((user) =>
              user.keywords?.some((userKw: any) => userKw.keywordId === kw._id)
            )
          )
        : [],
    [users?.length, keywords?.length]
  );

  const filteredUsers = useMemo(() => {
    if (selectedKeywords.length === 0) {
      return users;
    }
    const selectedKeywordIds = selectedKeywords.map((kw) => kw._id);
    return users.filter((user) =>
      user.keywords?.some((userKw: any) =>
        selectedKeywordIds.includes(userKw.keywordId)
      )
    );
  }, [users, selectedKeywords]);

  return (
    <>
      <PageHeading site={site || siteDoc} listing="people" />

      {keywordsUsed.length > 0 && (
        <Center mb="4">
          <Box w="100%" maxW="600px" p="4">
            <Select
              closeMenuOnSelect
              isMulti
              options={keywordsUsed}
              placeholder={
                <Trans i18nKey="common:labels.filterKeyword">
                  Filter by skills & interests
                </Trans>
              }
              styles={{
                control: (base) => ({
                  ...base,
                  borderRadius: 'var(--cocoso-border-radius)',
                }),
                multiValue: (base) => ({
                  ...base,
                  borderRadius: 'var(--cocoso-border-radius)',
                }),
              }}
              value={selectedKeywords}
              getOptionValue={(option: { _id: string }) => option._id}
              onChange={(selectedOptions) => {
                setSelectedKeywords([...selectedOptions]);
              }}
            />
          </Box>
        </Center>
      )}

      {users?.length === 0 && (
        <Center p="8">
          <Text>{tc('people.noOrganizers')}</Text>
        </Center>
      )}

      <People>
        {filteredUsers?.map((user: any) => {
          return <PersonTile key={user.username} user={user} />;
        })}
      </People>
    </>
  );
}

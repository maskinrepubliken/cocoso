import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import Select from 'react-select';

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
  '&:hover .portrait': { transform: 'scale(1.04)' },
  '&:hover strong': { textDecoration: 'underline' },
  '& strong': { display: 'block', fontSize: '1.05rem' },
  '& small': {
    color: 'var(--cocoso-colors-theme-700)',
    display: 'block',
    fontSize: '0.85rem',
  },
  '@media (max-width: 480px)': { width: '150px' },
});

const Portrait = styled('div', {
  aspectRatio: '1 / 1',
  background: 'var(--cocoso-colors-theme-700)',
  borderRadius: '50%',
  overflow: 'hidden',
  padding: '4px',
  transition: 'transform 0.2s ease',
  width: '100%',
  '& > *': {
    borderRadius: '50%',
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    overflow: 'hidden',
    width: '100%',
  },
});

const People = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2rem 2.5rem',
  justifyContent: 'center',
  padding: '1rem 0.5rem 3rem',
  '@media (max-width: 480px)': { gap: '1.5rem 1rem' },
});

// The organizers as round portraits. A portrait goes straight to the
// person's page, where their events are listed.
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
          const avatar = getImageUrl(user.avatar?.src, 'small');
          const name = displayName(user);
          return (
            <Person key={user.username} to={`/@${user.username}`}>
              <Portrait className="portrait">
                {avatar ? (
                  <img alt="" loading="lazy" src={avatar} />
                ) : (
                  <PlaceholderImage seed={user._id || user.username} />
                )}
              </Portrait>
              <span>
                <strong>{name}</strong>
                {name !== user.username && <small>@{user.username}</small>}
              </span>
            </Person>
          );
        })}
      </People>
    </>
  );
}

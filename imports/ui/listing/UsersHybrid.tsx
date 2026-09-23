import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import Select from 'react-select';

import { Box, Center, Text } from '/imports/ui/core';
import { siteAtom } from '/imports/state';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

import PageHeading from './PageHeading';
import InfiniteScroller from './InfiniteScroller';
import NewGridThumb from './NewGridThumb';

export interface UsersHybridProps {
  siteDoc: any;
  users: any[];
  keywords?: any[];
}

// A person's name, or their username when they have not given one.
export const displayName = (user: any) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username;

// The organizers, laid out like the places listing. A card goes straight to
// the person's page, where their events are listed.
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

      <Box px="2" pb="8">
        <InfiniteScroller
          hideFiltrerSorter
          isMasonry
          items={filteredUsers}
          newHelperLink={undefined}
          smallThumb={false}
        >
          {(user: any, index: number) => (
            <Box key={user.username} mb="2">
              <Link
                style={{ color: 'inherit', textDecoration: 'none' }}
                to={`/@${user.username}`}
              >
                <NewGridThumb
                  fixedImageHeight
                  imageUrl={getImageUrl(user.avatar?.src, 'small')}
                  index={index}
                  placeholderSeed={user._id || user.username}
                  subTitle={
                    displayName(user) !== user.username
                      ? `@${user.username}`
                      : undefined
                  }
                  title={displayName(user)}
                />
              </Link>
            </Box>
          )}
        </InfiniteScroller>
      </Box>
    </>
  );
}

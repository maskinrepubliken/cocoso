import React, { useMemo, useState } from 'react';
import {
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from 'react-router';
import dayjs from 'dayjs';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Code,
  Flex,
  Heading,
  Input,
  Select,
  Tabs,
  Text,
} from '/imports/ui/core';

import NiceList from '/imports/ui/generic/NiceList';
import { currentUserAtom, isDesktopAtom, roleAtom } from '/imports/state';
import { call } from '../../../api/_utils/shared';
import { message } from '/imports/ui/generic/message';
import { startViewAs } from '/imports/utils/viewAs';

import UsageReport from './UsageReport';
import { CreateAliasModal, DeleteAliasModal } from './AliasDialogs';
import Boxling from './Boxling';

const compareUsersByDate = (a, b) => {
  const rawA = a.joinDate || a.createdAt;
  const rawB = b.joinDate || b.createdAt;
  const dateA = rawA ? new Date(rawA) : new Date(0);
  const dateB = rawB ? new Date(rawB) : new Date(0);
  return dateA - dateB;
};

function MemberItem({ member }) {
  const [t] = useTranslation('members');

  return (
    <Box p="6">
      <Heading size="md" fontWeight="bold" mb="1">
        {member.username}
        {/* An alias is always an organizer: its role says nothing */}
        {member.isAlias ? (
          <Badge
            colorScheme="blue"
            size="sm"
            css={{ marginTop: '-1rem', marginLeft: '0.5rem' }}
          >
            {t('alias.label').toLowerCase()}
          </Badge>
        ) : (
          <Badge size="sm" css={{ marginTop: '-1rem', marginLeft: '0.5rem' }}>
            {t(`roles.${member.role}`).toLowerCase()}
          </Badge>
        )}
        {member.isOrganizer && (
          <Badge
            colorScheme="green"
            size="sm"
            css={{ marginTop: '-1rem', marginLeft: '0.5rem' }}
          >
            {t('organizer').toLowerCase()}
          </Badge>
        )}
        {!member.isPublic && (
          <Badge size="sm" css={{ marginTop: '-1rem', marginLeft: '0.5rem' }}>
            {t('hidden').toLowerCase()}
          </Badge>
        )}
      </Heading>
      {member.isAlias ? (
        <Text size="sm">
          {member.name ? `${member.name} · ` : ''}
          {t('alias.noLogin')}
        </Text>
      ) : (
        <Code size="sm">{member && member.email}</Code>
      )}
      <br />
      <br />
      <Text size="xs" color="gray.500" fontStyle="italic">
        {t('joinedAt', {
          date: dayjs(member.joinDate).format('D MMM YYYY'),
        })}
      </Text>
    </Box>
  );
}

function MemberList({ members }) {
  return (
    <NiceList
      actionsDisabled={false}
      itemBg="white"
      keySelector="id"
      list={members}
      virtual
    >
      {(member) => <MemberItem key={member.username} member={member} />}
    </NiceList>
  );
}

export default function Members() {
  const currentUser = useAtomValue(currentUserAtom);
  const isDesktop = useAtomValue(isDesktopAtom);
  const role = useAtomValue(roleAtom);
  const { members } = useLoaderData();
  const revalidator = useRevalidator();
  const [sortBy, setSortBy] = useState('join-date');
  const [filterWord, setFilterWord] = useState('');
  const [userForUsageReport, setUserForUsageReport] = useState(null);
  const [creatingAlias, setCreatingAlias] = useState(false);
  const [aliasToDelete, setAliasToDelete] = useState(null);
  const [t] = useTranslation('members');
  const [tc] = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();

  const filterOptions = useMemo(
    () => [
      { label: t('all'), value: 'all' },
      { label: t('roles.participant'), value: 'participant' },
      { label: t('roles.contributor'), value: 'contributor' },
      { label: t('roles.admin'), value: 'admin' },
      { label: t('organizer'), value: 'organizer' },
      { label: t('alias.label'), value: 'alias' },
    ],
    [t]
  );

  const sortOptions = useMemo(
    () => [
      { label: t('form.sort.date'), value: 'join-date' },
      { label: t('form.sort.user'), value: 'username' },
    ],
    [t]
  );

  // Keep hooks order stable; avoid early returns. Use conditional rendering below.

  const setAsParticipant = async (user) => {
    try {
      await call('setAsParticipant', user.id);
      revalidator.revalidate();
      message.success(
        t('message.success.participant', { username: user.username })
      );
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const setAsContributor = async (user) => {
    try {
      await call('setAsContributor', user.id);
      revalidator.revalidate();
      message.success(
        t('message.success.contributor', { username: user.username })
      );
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const setAsAdmin = async (user: any) => {
    try {
      await call('setAsAdmin', user.id);
      revalidator.revalidate();
      message.success(t('message.success.admin', { username: user.username }));
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const setOrganizer = async (user: any, isOrganizer: boolean) => {
    try {
      await call('setOrganizer', user.id, isOrganizer);
      revalidator.revalidate();
      message.success(
        t(`message.success.${isOrganizer ? 'organizer' : 'notOrganizer'}`, {
          username: user.username,
        })
      );
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const navigate = useNavigate();

  const viewAs = async (member: any) => {
    try {
      await startViewAs(member.id, member.username);
      message.success(t('viewAs.started', { username: member.username }));
      navigate('/');
    } catch (error: any) {
      message.error(error.reason || error.message || error.error);
    }
  };

  const setPublic = async (user: any, isPublic: boolean) => {
    try {
      await call('setProfilePublicAsAdmin', user.id, isPublic);
      revalidator.revalidate();
      message.success(
        t(`message.success.${isPublic ? 'shown' : 'hidden'}`, {
          username: user.username,
        })
      );
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const safeMembers = members || [];

  // An alias has no login and no role to change: its profile is edited
  // like any organizer's, and it can be hidden or removed.
  const aliasActions = (member: any) => [
    {
      content: t('alias.actions.edit'),
      handleClick: () => navigate(`/@${member.username}?edit=true`),
    },
    {
      content: t(
        member.isPublic ? 'actions.hideProfile' : 'actions.showProfile'
      ),
      handleClick: () => setPublic(member, !member.isPublic),
    },
    {
      content: t('actions.usageReport'),
      handleClick: () => setUserForUsageReport(member),
    },
    {
      content: t('alias.actions.delete'),
      handleClick: () => setAliasToDelete(member),
    },
  ];

  const membersList = useMemo(
    () =>
      safeMembers.map((member) => ({
        ...member,
        actions: member.isAlias ? aliasActions(member) : memberActions(member),
      })),
    [safeMembers, role, t]
  );

  function memberActions(member: any) {
    return [
      {
        content: t('actions.contributor'),
        handleClick: () => setAsContributor(member),
        isDisabled:
          ['admin', 'contributor'].includes(member.role) ||
          !['admin', 'contributor'].includes(role),
      },
      {
        content: t('actions.admin'),
        handleClick: () => setAsAdmin(member),
        isDisabled: member.role === 'admin',
      },
      {
        content: t('actions.participant'),
        handleClick: () => setAsParticipant(member),
        isDisabled:
          !['contributor'].includes(member.role) || !['admin'].includes(role),
      },
      {
        content: t(
          member.isOrganizer ? 'actions.notOrganizer' : 'actions.organizer'
        ),
        handleClick: () => setOrganizer(member, !member.isOrganizer),
        isDisabled: role !== 'admin',
      },
      {
        content: t(
          member.isPublic ? 'actions.hideProfile' : 'actions.showProfile'
        ),
        handleClick: () => setPublic(member, !member.isPublic),
        isDisabled: role !== 'admin',
      },
      {
        content: t('actions.viewAs'),
        handleClick: () => viewAs(member),
        isDisabled: role !== 'admin' || member.role === 'admin',
      },
      {
        content: t('actions.usageReport'),
        handleClick: () => setUserForUsageReport(member),
        isDisabled: member.role === 'participant',
      },
    ];
  }

  const membersFilteredWithType = useMemo(() => {
    const lowerCaseFilterWord = filterWord ? filterWord.toLowerCase() : '';
    if (!lowerCaseFilterWord) return membersList;
    return membersList.filter((member) => {
      // An alias has no email address, but a name
      return [member.username, member.email, member.name].some(
        (value) => value && value.toLowerCase().includes(lowerCaseFilterWord)
      );
    });
  }, [membersList, filterWord]);

  const membersSorted = useMemo(() => {
    const copy = [...membersFilteredWithType];
    switch (sortBy) {
      case 'username':
        return copy.sort((a, b) => a.username.localeCompare(b.username));
      case 'join-date':
      default:
        return copy.sort(compareUsersByDate).reverse();
    }
  }, [membersFilteredWithType, sortBy]);

  const show = searchParams.get('show');

  const membersRendered = useMemo(
    () =>
      membersSorted.filter(
        (m) =>
          !show ||
          show === 'all' ||
          show === m.role ||
          (show === 'organizer' && m.isOrganizer) ||
          (show === 'alias' && m.isAlias)
      ),
    [membersSorted, show]
  );

  const tabs = useMemo(
    () =>
      filterOptions.map((item) => ({
        title: item.label,
        onClick: () =>
          setSearchParams((params) => ({ ...params, show: item.value })),
      })),
    [filterOptions, membersRendered, t]
  );

  const tabIndex = show
    ? filterOptions.findIndex((opt) => opt.value === show)
    : 0;

  if (!currentUser || role !== 'admin') {
    return (
      <Center>
        <Alert message={tc('message.access.deny')} type="warning" />
      </Center>
    );
  }

  return (
    <>
      <Tabs tabs={tabs} index={tabIndex} />

      <Boxling mb="4" mt="8">
        <Heading size="md" css={{ marginBottom: '0.5rem' }}>
          <span
            style={{
              fontSize: '150%',
            }}
          >
            {membersRendered.length}
          </span>{' '}
          <Trans
            i18nKey={`admin:users.${
              membersRendered.length > 1 ? 'usersListed' : 'userListed'
            }`}
          />
        </Heading>

        <Box mb="2">
          <Text fontSize="sm">{tc('labels.filterAndSort')}</Text>
        </Box>

        <Flex direction={isDesktop ? 'row' : 'column'} w="100%">
          <Box
            pr={isDesktop ? '4' : '0'}
            pb={isDesktop ? '0' : '2'}
            css={{
              flexBasis: '60%',
            }}
          >
            <Input
              placeholder={t('form.holder')}
              value={filterWord}
              onChange={(event) => setFilterWord(event.target.value)}
            />
          </Box>
          <Box css={{ flexBasis: '40%' }}>
            <Select
              name="sorter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Box>
        </Flex>

        <Box mt="4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreatingAlias(true)}
          >
            {t('alias.create.title')}
          </Button>
          <Box mt="2">
            <Text fontSize="sm">{t('alias.helper')}</Text>
          </Box>
        </Box>
      </Boxling>

      <MemberList members={membersRendered} />

      <UsageReport
        isOpen={Boolean(userForUsageReport)}
        user={userForUsageReport}
        onClose={() => setUserForUsageReport(null)}
      />

      <CreateAliasModal
        open={creatingAlias}
        onClose={() => setCreatingAlias(false)}
        onCreated={(alias) => {
          setCreatingAlias(false);
          // Straight to its profile, to add a picture and the rest
          navigate(`/@${alias.username}?edit=true`);
        }}
      />
      <DeleteAliasModal
        alias={aliasToDelete}
        onClose={() => setAliasToDelete(null)}
        onDeleted={() => {
          setAliasToDelete(null);
          revalidator.revalidate();
        }}
      />
    </>
  );
}

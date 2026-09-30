import { Link, useNavigate } from 'react-router';
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import Plus from 'lucide-react/dist/esm/icons/plus';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MessagesSquare from 'lucide-react/dist/esm/icons/messages-square';
import Users from 'lucide-react/dist/esm/icons/users';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';

import {
  Alert,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Loader,
  Text,
} from '/imports/ui/core';
import { currentUserAtom, roleAtom } from '/imports/state';
import { call } from '/imports/api/_utils/shared';

import Boxling from './Boxling';

interface Occasion {
  activityId: string;
  title: string;
  place?: string;
  startDate: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  isRegistrationOpen: boolean;
  people: number;
}

interface Registration {
  activityId: string;
  title: string;
  startDate: string;
  startTime: string;
  name: string;
  numberOfPeople: number;
  registerDate: Date;
}

interface NewMember {
  username: string;
  name: string;
  role: string;
  joinDate: Date;
}

interface Overview {
  activityCount: number;
  upcoming: Occasion[];
  upcomingCount: number;
  recentRegistrations: Registration[];
  recentRegistrationCount: number;
  newMembers: NewMember[];
}

// Set-up pages an admin visits now and then; kept below the daily overview.
const shortCuts = () => [
  {
    label: <Trans i18nKey="admin:settings.tabs.logo" />,
    helper: <Trans i18nKey="admin:settings.tabs.logoHelper" />,
    link: '/admin/settings/organization/logo',
  },
  {
    label: <Trans i18nKey="admin:settings.tabs.info" />,
    helper: <Trans i18nKey="admin:settings.tabs.infoHelper" />,
    link: '/admin/settings/organization/info',
  },
  {
    label: <Trans i18nKey="admin:design.title" />,
    helper: <Trans i18nKey="admin:design.description" />,
    link: '/admin/settings/design',
  },
  {
    label: <Trans i18nKey="admin:composable.title" />,
    helper: <Trans i18nKey="admin:composable.description" />,
    link: '/admin/composable-pages',
  },
  {
    label: <Trans i18nKey="admin:settings.tabs.footer" />,
    helper: <Trans i18nKey="admin:settings.tabs.footerHelper" />,
    link: '/admin/settings/organization/footer',
  },
  {
    label: <Trans i18nKey="admin:settings.tabs.menu" />,
    helper: <Trans i18nKey="admin:settings.tabs.menuHelper" />,
    link: '/admin/settings/menu',
  },
  {
    label: <Trans i18nKey="admin:listings.title" />,
    helper: <Trans i18nKey="admin:listings.shortcutHelper" />,
    link: '/admin/listing/activities',
  },
  {
    label: <Trans i18nKey="admin:emails.title" />,
    helper: <Trans i18nKey="admin:emails.shortcutHelper" />,
    link: '/admin/emails',
  },
  {
    label: <Trans i18nKey="admin:newsletter.title" />,
    helper: <Trans i18nKey="admin:newsletter.shortcutHelper" />,
    link: '/admin/email-newsletter',
  },
];

// Only the first letter: Swedish month names stay lower case.
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const underlineCss = {
  display: 'block',
  marginTop: '0.5rem',
  textDecoration: 'underline',
};

const rowCss = {
  borderBottom: '1px solid var(--cocoso-colors-bluegray-100)',
  color: 'var(--cocoso-colors-bluegray-900)',
  padding: '0.625rem 0',
  '&:hover': { color: 'var(--cocoso-colors-theme-600)' },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Boxling mb="6">
      <Heading color="bluegray.800" css={{ marginBottom: '0.75rem' }} size="sm">
        {title}
      </Heading>
      {children}
    </Boxling>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Boxling css={{ flex: '1 1 140px' }} p="4">
      <Text
        css={{
          color: 'var(--cocoso-colors-bluegray-900)',
          display: 'block',
          lineHeight: '1',
        }}
        fontSize="3xl"
        fontWeight="bold"
      >
        {value}
      </Text>
      <Text css={{ display: 'block', marginTop: '0.25rem' }} fontSize="sm">
        {label}
      </Text>
    </Boxling>
  );
}

function SignUps({ occasion }: { occasion: Occasion }) {
  const [t] = useTranslation('admin');
  if (!occasion.isRegistrationOpen) {
    return (
      <Badge colorScheme="gray" size="sm" variant="subtle">
        {t('overview.upcoming.noRegistration')}
      </Badge>
    );
  }
  const { people, capacity } = occasion;
  const isFull = Boolean(capacity) && people >= (capacity ?? 0);
  let label = t('overview.upcoming.signedUp', { count: people });
  if (isFull) {
    label = `${t('overview.upcoming.full')} · ${people}/${capacity}`;
  } else if (capacity) {
    label = t('overview.upcoming.signedUpOf', { count: people, capacity });
  }
  return (
    <Badge
      colorScheme={isFull ? 'red' : people > 0 ? 'green' : 'gray'}
      size="sm"
      variant="subtle"
    >
      {label}
    </Badge>
  );
}

interface ListProps {
  overview: Overview;
  dateLocale: string;
}

function Upcoming({ overview, dateLocale }: ListProps) {
  const [t] = useTranslation('admin');
  const { upcoming, upcomingCount } = overview;

  if (upcoming.length === 0) {
    return <Text>{t('overview.upcoming.empty')}</Text>;
  }

  const days: { date: string; occasions: Occasion[] }[] = [];
  upcoming.forEach((occasion) => {
    const last = days[days.length - 1];
    if (last?.date === occasion.startDate) {
      last.occasions.push(occasion);
    } else {
      days.push({ date: occasion.startDate, occasions: [occasion] });
    }
  });

  const today = dayjs().format('YYYY-MM-DD');

  return (
    <Box>
      {days.map((day) => (
        <Box key={day.date} mb="3">
          <Flex align="center" gap="2">
            <Text color="bluegray.600" fontSize="sm" fontWeight="bold">
              {capitalize(
                dayjs(day.date).locale(dateLocale).format('dddd D MMMM')
              )}
            </Text>
            {day.date === today && (
              <Badge colorScheme="blue" size="sm">
                {t('overview.upcoming.today')}
              </Badge>
            )}
          </Flex>
          {day.occasions.map((occasion) => (
            <Link
              key={`${occasion.activityId}${occasion.startTime}`}
              style={{ display: 'block' }}
              to={`/activities/${occasion.activityId}`}
            >
              <Flex
                align="center"
                css={rowCss}
                gap="3"
                justify="space-between"
                wrap="wrap"
              >
                <Box css={{ flex: '1 1 220px', minWidth: 0 }}>
                  <Text css={{ display: 'block' }} fontWeight="bold">
                    {occasion.title}
                  </Text>
                  <Text css={{ display: 'block' }} fontSize="sm">
                    {occasion.startTime}–{occasion.endTime}
                    {occasion.place && ` · ${occasion.place}`}
                  </Text>
                </Box>
                <SignUps occasion={occasion} />
              </Flex>
            </Link>
          ))}
        </Box>
      ))}
      {upcomingCount > upcoming.length && (
        <Link to="/calendar">
          <Text css={underlineCss} fontSize="sm">
            {t('overview.upcoming.more', {
              count: upcomingCount - upcoming.length,
            })}
          </Text>
        </Link>
      )}
    </Box>
  );
}

function Registrations({ overview, dateLocale }: ListProps) {
  const [t] = useTranslation('admin');
  const { recentRegistrations } = overview;

  if (recentRegistrations.length === 0) {
    return <Text>{t('overview.registrations.empty')}</Text>;
  }

  return (
    <Box>
      {recentRegistrations.map((r) => (
        <Link
          key={`${r.activityId}${r.startDate}${r.name}${r.registerDate}`}
          style={{ display: 'block' }}
          to={`/activities/${r.activityId}`}
        >
          <Box css={rowCss}>
            <Text css={{ display: 'block' }}>
              <strong>{r.name}</strong>
              {r.numberOfPeople > 1 &&
                ` (${t('overview.registrations.people', {
                  count: r.numberOfPeople,
                })})`}{' '}
              {t('overview.registrations.for')} <em>{r.title}</em>
            </Text>
            <Text css={{ display: 'block' }} fontSize="sm">
              {dayjs(r.startDate).locale(dateLocale).format('ddd D MMM')}{' '}
              {r.startTime} ·{' '}
              {dayjs(r.registerDate).locale(dateLocale).format('D MMM HH:mm')}
            </Text>
          </Box>
        </Link>
      ))}
    </Box>
  );
}

function NewMembers({ overview, dateLocale }: ListProps) {
  const [t] = useTranslation('admin');
  const [tm] = useTranslation('members');
  const { newMembers } = overview;

  return (
    <Box>
      {newMembers.length === 0 && <Text>{t('overview.members.empty')}</Text>}
      {newMembers.map((m) => (
        <Link
          key={m.username}
          style={{ display: 'block' }}
          to={`/@${m.username}`}
        >
          <Flex align="center" css={rowCss} justify="space-between" wrap="wrap">
            <Text>
              <strong>{m.username}</strong>
              {m.name && ` · ${m.name}`}
            </Text>
            <Text fontSize="sm">
              {tm(`roles.${m.role}`)} ·{' '}
              {dayjs(m.joinDate).locale(dateLocale).format('D MMM')}
            </Text>
          </Flex>
        </Link>
      ))}
      <Link to="/admin/users?show=all">
        <Text css={underlineCss} fontSize="sm">
          {t('overview.members.all')}
        </Text>
      </Link>
    </Box>
  );
}

function Settings() {
  const navigate = useNavigate();
  const [t] = useTranslation('admin');

  return (
    <Box mt="8">
      <Heading color="bluegray.800" size="sm">
        {t('overview.settings.title')}
      </Heading>
      <Text css={{ display: 'block', marginBottom: '0.75rem' }} fontSize="sm">
        {t('overview.settings.helper')}
      </Text>
      <Flex align="stretch" gap="2" wrap="wrap">
        {shortCuts().map((item) => (
          <Boxling
            key={item.link}
            css={{ cursor: 'pointer', flex: '1 1 180px' }}
            noHoverEffect={false}
            p="3"
            onClick={() => navigate(item.link)}
          >
            <Text color="blue.700" css={{ display: 'block' }} fontWeight="bold">
              {item.label}
            </Text>
            <Text css={{ display: 'block' }} fontSize="sm">
              {item.helper}
            </Text>
          </Boxling>
        ))}
      </Flex>
    </Box>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();
  const [t, i18n] = useTranslation('admin');
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  const isAdmin = role === 'admin';
  const dateLocale = i18n.language === 'en' ? 'en-gb' : i18n.language;
  const unread = Math.max(0, (currentUser as any)?.unreadMessageCount ?? 0);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    call('getHomeOverview')
      .then((result) => setOverview(result as Overview))
      .catch(() => setError(true));
  }, [currentUser?._id, role]);

  const name = (currentUser as any)?.firstName || currentUser?.username;

  return (
    <Box>
      <Heading css={{ marginBottom: '0.25rem' }} size="md">
        {t('overview.greeting', { name })}
      </Heading>
      <Text css={{ display: 'block', marginBottom: '1rem' }}>
        {isAdmin ? t('overview.introAdmin') : t('overview.intro')}
      </Text>

      <Flex gap="2" mb="6" wrap="wrap">
        <Button
          leftIcon={<Plus />}
          onClick={() => navigate('/activities?new=true')}
        >
          {t('overview.actions.newActivity')}
        </Button>
        <Button
          leftIcon={<CalendarDays />}
          variant="outline"
          onClick={() => navigate('/calendar')}
        >
          {t('overview.actions.calendar')}
        </Button>
        <Button
          leftIcon={<MessagesSquare />}
          variant="outline"
          onClick={() => navigate('/admin/messages')}
        >
          {t('overview.actions.messages')}
          {unread > 0 && ` (${unread})`}
        </Button>
        {isAdmin && (
          <>
            <Button
              leftIcon={<Users />}
              variant="outline"
              onClick={() => navigate('/admin/users?show=all')}
            >
              {t('overview.actions.users')}
            </Button>
            <Button
              leftIcon={<MapPin />}
              variant="outline"
              onClick={() => navigate('/admin/locations')}
            >
              {t('overview.actions.locations')}
            </Button>
          </>
        )}
      </Flex>

      {error && (
        <Box mb="6">
          <Alert type="error">{t('overview.error')}</Alert>
        </Box>
      )}

      {!overview && !error && <Loader />}

      {overview && (
        <>
          <Flex gap="3" mb="6" wrap="wrap">
            <Stat
              label={t('overview.stats.upcoming')}
              value={overview.upcomingCount}
            />
            <Stat
              label={t('overview.stats.registrations')}
              value={overview.recentRegistrationCount}
            />
            {isAdmin ? (
              <Stat
                label={t('overview.stats.members')}
                value={overview.newMembers.length}
              />
            ) : (
              <Stat
                label={t('overview.stats.activities')}
                value={overview.activityCount}
              />
            )}
          </Flex>

          <Section title={t('overview.upcoming.title')}>
            <Upcoming dateLocale={dateLocale} overview={overview} />
          </Section>

          <Section title={t('overview.registrations.title')}>
            <Registrations dateLocale={dateLocale} overview={overview} />
          </Section>

          {isAdmin && (
            <Section title={t('overview.members.title')}>
              <NewMembers dateLocale={dateLocale} overview={overview} />
            </Section>
          )}
        </>
      )}

      {isAdmin && <Settings />}
    </Box>
  );
}

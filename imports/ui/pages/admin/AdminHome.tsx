import { Link, useNavigate } from 'react-router';
import React, { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import Plus from 'lucide-react/dist/esm/icons/plus';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
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
import { sitePath } from '/imports/api/_utils/paths';

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

interface NewActivity {
  _id: string;
  title: string;
  author: string | null;
  place?: string;
  startDate: string | null;
  startTime: string | null;
  createdAt: Date;
  isPublished: boolean;
}

interface NewPlace {
  _id: string;
  label: string;
  createdAt: Date;
  createdBy: string | null;
  managers: string[];
  isPart: boolean;
  isUnlisted: boolean;
}

// An entry in the mirrors' logbook: one run, or several alike in a row
interface MirrorRun {
  _id: string;
  mirrorName: string;
  outcome: 'changed' | 'unchanged' | 'failed';
  created: number;
  updated: number;
  removed: number;
  problem?: string;
  firstAt: Date;
  at: Date;
  times: number;
}

interface Overview {
  activityCount: number;
  upcoming: Occasion[];
  upcomingCount: number;
  recentRegistrations: Registration[];
  recentRegistrationCount: number;
  newMembers: NewMember[];
  newActivities?: NewActivity[];
  newActivityCount?: number;
  newPlaces?: NewPlace[];
  mirrorRuns?: MirrorRun[];
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
  borderBottom: '1px solid var(--cocoso-linje)',
  color: 'var(--cocoso-mylla)',
  padding: '0.625rem 0',
  '&:hover': { color: 'var(--cocoso-colors-theme-600)' },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    // Leave room for the sticky status bar when jumped to.
    <Boxling css={{ scrollMarginTop: '6rem' }} id={id} mb="6">
      <Heading css={{ marginBottom: '0.75rem' }} size="sm">
        {title}
      </Heading>
      {children}
    </Boxling>
  );
}

interface StatItem {
  id: string;
  value: number;
  label: string;
}

// The status bar at the top: one tile per section, showing its count and
// jumping to it. It stays in view while scrolling and marks where you are.
function StatusBar({ items }: { items: StatItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const ticking = useRef(false);
  // The tile last clicked stays marked while its section is on screen, since
  // the last sections can be too short to ever reach the top of the page.
  const jumpedTo = useRef<string | null>(null);
  const reached = useRef(false);
  const sectionIds = items.map((item) => item.id).join(',');

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) {
        return;
      }
      ticking.current = true;
      window.requestAnimationFrame(() => {
        ticking.current = false;
        if (jumpedTo.current) {
          const rect = document
            .getElementById(jumpedTo.current)
            ?.getBoundingClientRect();
          const onScreen =
            rect && rect.top < window.innerHeight && rect.bottom > 100;
          // Hold while the smooth scroll travels there, let go once it has
          // been reached and scrolled away from again.
          if (onScreen) {
            reached.current = true;
            return;
          }
          if (!reached.current) {
            return;
          }
          jumpedTo.current = null;
        }
        const ids = sectionIds.split(',');
        let current = ids[0];
        // A short page can end before its last sections reach the top.
        const atBottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4;
        ids.forEach((id) => {
          const top = document.getElementById(id)?.getBoundingClientRect().top;
          if (
            top !== undefined &&
            (top < 160 || (atBottom && top < window.innerHeight))
          ) {
            current = id;
          }
        });
        setActive(current);
      });
    };
    // Scrolling by hand hands the marking back to the scroll position.
    const release = () => {
      jumpedTo.current = null;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchmove', release, { passive: true });
    window.addEventListener('keydown', release);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchmove', release);
      window.removeEventListener('keydown', release);
    };
  }, [sectionIds]);

  const jumpTo = (id: string) => {
    jumpedTo.current = id;
    reached.current = false;
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Flex
      align="stretch"
      gap="2"
      mb="6"
      css={{
        backgroundColor: 'var(--cocoso-season-golv)',
        padding: '0.5rem 0',
        position: 'sticky',
        top: '0',
        zIndex: 5,
      }}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            aria-current={isActive ? 'true' : undefined}
            type="button"
            style={{
              background: 'var(--cocoso-papper)',
              border: 'none',
              borderBottom: '3px solid',
              borderBottomColor: isActive
                ? 'var(--cocoso-colors-theme-700)'
                : 'transparent',
              borderRadius: 'var(--cocoso-radius-falt)',
              boxShadow: isActive
                ? 'var(--cocoso-skugga-kort)'
                : 'var(--cocoso-skugga)',
              fontFamily: 'var(--cocoso-font-ui)',
              cursor: 'pointer',
              flex: '1 1 0',
              minWidth: 0,
              padding: '0.625rem 0.5rem',
              textAlign: 'left',
            }}
            onClick={() => jumpTo(item.id)}
          >
            <Text
              css={{
                color: 'var(--cocoso-mylla)',
                display: 'block',
                fontFamily: 'var(--cocoso-font-display)',
                fontVariationSettings: '"SOFT" 60',
                lineHeight: '1.1',
              }}
              fontSize="2xl"
              fontWeight="bold"
            >
              {item.value}
            </Text>
            <Text
              css={{
                display: 'block',
                lineHeight: '1.25',
              }}
              fontSize="sm"
              fontWeight={isActive ? 'bold' : 'normal'}
            >
              {item.label}
            </Text>
          </button>
        );
      })}
    </Flex>
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
            <Text
              fontSize="sm"
              fontWeight="bold"
              css={{ color: 'var(--cocoso-mylla-soft)' }}
            >
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
              to={sitePath('activities', occasion.activityId)}
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
        <Link to={sitePath('calendar')}>
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
          to={sitePath('activities', r.activityId)}
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

// Events added lately by people (not those a mirror fetched): what, by
// whom, where and when
function NewActivities({ overview, dateLocale }: ListProps) {
  const [t] = useTranslation('admin');
  const activities = overview.newActivities || [];
  const count = overview.newActivityCount || 0;

  return (
    <Box>
      {activities.length === 0 && <Text>{t('overview.activities.empty')}</Text>}
      {activities.map((activity) => (
        <Link
          key={activity._id}
          style={{ display: 'block' }}
          to={sitePath('activities', activity._id)}
        >
          <Flex
            align="center"
            css={rowCss}
            gap="3"
            justify="space-between"
            wrap="wrap"
          >
            <Box css={{ flex: '1 1 220px', minWidth: 0 }}>
              <Text css={{ display: 'block' }}>
                <strong>{activity.title}</strong>
                {!activity.isPublished && (
                  <>
                    {' '}
                    <Badge colorScheme="gray" size="sm" variant="subtle">
                      {t('overview.activities.draft')}
                    </Badge>
                  </>
                )}
              </Text>
              <Text css={{ display: 'block' }} fontSize="sm">
                {[
                  activity.author &&
                    t('overview.activities.by', { username: activity.author }),
                  activity.place,
                  activity.startDate &&
                    `${dayjs(activity.startDate)
                      .locale(dateLocale)
                      .format('ddd D MMM')} ${activity.startTime || ''}`.trim(),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Box>
            <Text fontSize="sm">
              {t('overview.activities.added', {
                at: dayjs(activity.createdAt)
                  .locale(dateLocale)
                  .format('D MMM'),
              })}
            </Text>
          </Flex>
        </Link>
      ))}
      {count > activities.length && (
        <Text css={{ display: 'block', marginTop: '0.5rem' }} fontSize="sm">
          {t('overview.activities.more', { count: count - activities.length })}
        </Text>
      )}
      <Link to={sitePath('activities')}>
        <Text css={underlineCss} fontSize="sm">
          {t('overview.activities.all')}
        </Text>
      </Link>
    </Box>
  );
}

// Places added lately: by whom and who looks after them, to spot misuse
function NewPlaces({ overview, dateLocale }: ListProps) {
  const [t] = useTranslation('admin');
  const places = overview.newPlaces || [];

  return (
    <Box>
      {places.length === 0 && <Text>{t('overview.places.empty')}</Text>}
      {places.map((place) => (
        <Link
          key={place._id}
          style={{ display: 'block' }}
          to={sitePath('resources', place._id)}
        >
          <Flex align="center" css={rowCss} justify="space-between" wrap="wrap">
            <Text>
              <strong>{place.label}</strong>
              {place.isUnlisted && ` · ${t('overview.places.unlisted')}`}
              {place.isPart &&
                !place.isUnlisted &&
                ` · ${t('overview.places.part')}`}
            </Text>
            <Text fontSize="sm">
              {[
                place.createdBy &&
                  t('overview.places.by', { username: place.createdBy }),
                place.managers.length
                  ? t('overview.places.managers', {
                      usernames: place.managers.join(', '),
                    })
                  : t('overview.places.noManagers'),
                dayjs(place.createdAt).locale(dateLocale).format('D MMM'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Flex>
        </Link>
      ))}
      <Link to={sitePath('resources')}>
        <Text css={underlineCss} fontSize="sm">
          {t('overview.places.all')}
        </Text>
      </Link>
    </Box>
  );
}

// The mirrors' logbook: what each run of a mirror (Admin → Speglingar)
// brought or why it failed, in plain words, latest first
function MirrorLog({ overview, dateLocale }: ListProps) {
  const [t] = useTranslation('admin');
  const runs = overview.mirrorRuns || [];
  const when = (date: Date) =>
    dayjs(date).locale(dateLocale).format('D MMM HH:mm');

  const tell = (run: MirrorRun) => {
    if (run.outcome === 'failed') {
      return t(`overview.mirrors.problem.${run.problem || 'source'}`);
    }
    if (run.outcome === 'unchanged') {
      return t('overview.mirrors.unchanged');
    }
    return t('overview.mirrors.changed', {
      what: [
        run.created > 0 &&
          t('overview.mirrors.created', { count: run.created }),
        run.updated > 0 &&
          t('overview.mirrors.updated', { count: run.updated }),
        run.removed > 0 &&
          t('overview.mirrors.removed', { count: run.removed }),
      ]
        .filter(Boolean)
        .join(', '),
    });
  };

  return (
    <Box>
      {runs.length === 0 && <Text>{t('overview.mirrors.empty')}</Text>}
      {runs.map((run) => (
        <Link key={run._id} style={{ display: 'block' }} to="/admin/mirrors">
          <Flex
            align="center"
            css={rowCss}
            gap="3"
            justify="space-between"
            wrap="wrap"
          >
            <Box css={{ flex: '1 1 220px', minWidth: 0 }}>
              <Text css={{ display: 'block' }} fontWeight="bold">
                {run.mirrorName}
              </Text>
              <Text css={{ display: 'block' }} fontSize="sm">
                {tell(run)}
              </Text>
              <Text css={{ display: 'block' }} fontSize="sm">
                {run.times > 1
                  ? t('overview.mirrors.several', {
                      count: run.times,
                      from: when(run.firstAt),
                      to: when(run.at),
                    })
                  : when(run.at)}
              </Text>
            </Box>
            <Badge
              colorScheme={
                run.outcome === 'failed'
                  ? 'red'
                  : run.outcome === 'changed'
                  ? 'green'
                  : 'gray'
              }
              size="sm"
              variant="subtle"
            >
              {t(`overview.mirrors.outcome.${run.outcome}`)}
            </Badge>
          </Flex>
        </Link>
      ))}
      <Link to="/admin/mirrors">
        <Text css={underlineCss} fontSize="sm">
          {t('overview.mirrors.all')}
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
      <Heading size="sm">{t('overview.settings.title')}</Heading>
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
          onClick={() => navigate(`${sitePath('activities')}?new=true`)}
        >
          {t('overview.actions.newActivity')}
        </Button>
        <Button
          leftIcon={<CalendarDays />}
          variant="outline"
          onClick={() => navigate(sitePath('calendar'))}
        >
          {t('overview.actions.calendar')}
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
          <StatusBar
            items={[
              {
                id: 'registrations',
                value: overview.recentRegistrationCount,
                label: t('overview.stats.registrations'),
              },
              {
                id: 'upcoming',
                value: overview.upcomingCount,
                label: t('overview.stats.upcoming'),
              },
              ...(isAdmin
                ? [
                    {
                      id: 'activities',
                      value: overview.newActivityCount || 0,
                      label: t('overview.stats.newActivities'),
                    },
                    {
                      id: 'members',
                      value: overview.newMembers.length,
                      label: t('overview.stats.members'),
                    },
                    {
                      id: 'places',
                      value: overview.newPlaces?.length || 0,
                      label: t('overview.stats.places'),
                    },
                    {
                      id: 'mirrors',
                      value: (overview.mirrorRuns || []).reduce(
                        (sum, run) => sum + run.created,
                        0
                      ),
                      label: t('overview.stats.mirrors'),
                    },
                  ]
                : []),
            ]}
          />

          <Section id="registrations" title={t('overview.registrations.title')}>
            <Registrations dateLocale={dateLocale} overview={overview} />
          </Section>

          <Section id="upcoming" title={t('overview.upcoming.title')}>
            <Upcoming dateLocale={dateLocale} overview={overview} />
          </Section>

          {isAdmin && (
            <Section id="activities" title={t('overview.activities.title')}>
              <NewActivities dateLocale={dateLocale} overview={overview} />
            </Section>
          )}

          {isAdmin && (
            <Section id="members" title={t('overview.members.title')}>
              <NewMembers dateLocale={dateLocale} overview={overview} />
            </Section>
          )}

          {isAdmin && (
            <Section id="places" title={t('overview.places.title')}>
              <NewPlaces dateLocale={dateLocale} overview={overview} />
            </Section>
          )}

          {isAdmin && (
            <Section id="mirrors" title={t('overview.mirrors.title')}>
              <MirrorLog dateLocale={dateLocale} overview={overview} />
            </Section>
          )}
        </>
      )}

      {isAdmin && <Settings />}
    </Box>
  );
}

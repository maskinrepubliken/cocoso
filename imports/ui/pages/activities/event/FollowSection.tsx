import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down';

import { styled } from '/stitches.config';
import { Button } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { currentUserAtom } from '/imports/state';
import { message } from '/imports/ui/generic/message';

import Section, { Muted } from './Section';
import { sitePath } from '/imports/api/_utils/paths';

const News = styled('ul', {
  listStyle: 'none',
  margin: '0 0 1rem',
  padding: 0,
  '& li': {
    borderBottom: '1px solid var(--cocoso-colors-theme-100)',
    padding: '0.5rem 0',
  },
  '& li:first-child': { paddingTop: 0 },
});

const NewsText = styled('p', {
  margin: '0.15rem 0 0',
  whiteSpace: 'pre-line',
});

const Actions = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem 1rem',
  marginTop: '0.75rem',
});

const Stack = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
  '&:empty': { display: 'none' },
});

// The section folded: its name as text straight on the card, across its
// width, with an arrow that turns when it is unfolded
const Unfold = styled('button', {
  alignItems: 'center',
  background: 'none',
  border: 'none',
  color: 'var(--cocoso-colors-theme-800)',
  cursor: 'pointer',
  display: 'flex',
  fontFamily: 'var(--cocoso-font-display)',
  fontSize: '1.2rem',
  fontVariationSettings: '"SOFT" 60',
  fontWeight: 600,
  justifyContent: 'space-between',
  padding: 0,
  textAlign: 'left',
  width: '100%',
  '& svg': {
    flexShrink: 0,
    height: '1.25rem',
    transition: 'rotate 0.2s ease',
    width: '1.25rem',
  },
  '&[aria-expanded="true"] svg': { rotate: '180deg' },
  '&:hover': { color: 'var(--cocoso-colors-theme-600)' },
  '&:focus-visible': {
    borderRadius: '4px',
    outline: '2px solid var(--cocoso-colors-theme-500)',
    outlineOffset: '4px',
  },
});

const Extra = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  marginTop: '0.875rem',
  '&:empty': { display: 'none' },
});

interface Update {
  _id: string;
  message: string;
  sentAt: Date;
}

interface FollowSectionProps {
  activity: { _id: string; isArchived?: boolean; cancelledAt?: Date };
  // Every date is behind us: nothing left to follow
  isOver: boolean;
  // Unfolded with the rest, e.g. "Lägg till i kalendern"
  children?: React.ReactNode;
}

// Updates about the event: the organizer's messages so far, and a button
// to follow it and hear about the next ones (imports/api/notifications).
// Loaded in the browser; the server renders only the title and button.
export default function FollowSection({
  activity,
  isOver,
  children,
}: FollowSectionProps) {
  const [tc] = useTranslation('common');
  const currentUser = useAtomValue(currentUserAtom);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    call('getActivityUpdates', activity._id)
      .then((found) => setUpdates(found as Update[]))
      .catch(() => setUpdates([]));
  }, [activity._id]);

  useEffect(() => {
    if (!currentUser) {
      setIsFollowing(false);
      return;
    }
    call('getActivityFollowState', activity._id)
      .then((state: any) => setIsFollowing(Boolean(state?.isFollowing)))
      .catch(() => setIsFollowing(false));
  }, [activity._id, currentUser?._id]);

  const toggle = async () => {
    setBusy(true);
    try {
      await call(
        isFollowing ? 'unfollowActivity' : 'followActivity',
        activity._id
      );
      setIsFollowing(!isFollowing);
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    } finally {
      setBusy(false);
    }
  };

  const canFollow = !activity.isArchived && !activity.cancelledAt && !isOver;
  if (!canFollow && updates.length === 0) {
    return null;
  }

  return (
    <Section
      hideTitle
      look="plain"
      order={3}
      title={
        updates.length > 0
          ? tc('event.sections.news')
          : tc('event.sections.follow')
      }
    >
      {updates.length > 0 && (
        <News>
          {updates.map((update) => (
            <li key={update._id}>
              <Muted>{dayjs(update.sentAt).format('D MMM YYYY, HH:mm')}</Muted>
              <NewsText>{update.message}</NewsText>
            </li>
          ))}
        </News>
      )}

      <Stack>
        {canFollow && (
          <>
            <Unfold
              aria-expanded={open}
              type="button"
              onClick={() => setOpen(!open)}
            >
              {isFollowing
                ? tc('event.follow.followed')
                : tc('event.follow.follow')}
              <ChevronDownIcon aria-hidden />
            </Unfold>

            {open && (
              <div>
                <Muted>
                  {isFollowing
                    ? tc('event.follow.following')
                    : tc('event.follow.intro')}
                </Muted>
                <Actions>
                  {currentUser ? (
                    <Button
                      disabled={busy}
                      size="sm"
                      variant={isFollowing ? 'ghost' : 'solid'}
                      onClick={toggle}
                    >
                      {isFollowing
                        ? tc('event.follow.unfollow')
                        : tc('event.follow.start')}
                    </Button>
                  ) : (
                    <Link to={sitePath('login')}>
                      <Button size="sm">{tc('event.follow.login')}</Button>
                    </Link>
                  )}
                  {currentUser && (
                    <Link to="?settings=me">
                      <Muted as="span">{tc('event.follow.settings')}</Muted>
                    </Link>
                  )}
                </Actions>
                {!isFollowing && (
                  <Muted css={{ marginTop: '0.5rem' }}>
                    {tc('event.follow.attendees')}
                  </Muted>
                )}
                {children && <Extra>{children}</Extra>}
              </div>
            )}
          </>
        )}
      </Stack>
    </Section>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

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

interface Update {
  _id: string;
  message: string;
  sentAt: Date;
}

interface FollowSectionProps {
  activity: { _id: string; isArchived?: boolean; cancelledAt?: Date };
  // Every date is behind us: nothing left to follow
  isOver: boolean;
  // Shown under the button, e.g. "Lägg till i kalendern"
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

  // The first press unfolds what following means and the notification
  // settings, and follows for the one who is logged in; folded, the
  // section is one button.
  const press = () => {
    if (currentUser && !isFollowing) {
      setOpen(true);
      toggle();
    } else {
      setOpen(!open);
    }
  };

  const canFollow = !activity.isArchived && !activity.cancelledAt && !isOver;
  if (!canFollow && updates.length === 0) {
    return <>{children}</>;
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
            <Button
              aria-expanded={open}
              css={{ alignSelf: 'flex-start' }}
              disabled={busy}
              size="sm"
              variant="outline"
              onClick={press}
            >
              {isFollowing
                ? tc('event.follow.followed')
                : tc('event.follow.follow')}
            </Button>

            {open && (
              <div>
                <Muted>
                  {isFollowing
                    ? tc('event.follow.following')
                    : tc('event.follow.intro')}
                </Muted>
                <Actions>
                  {currentUser ? (
                    isFollowing && (
                      <Button
                        disabled={busy}
                        size="sm"
                        variant="ghost"
                        onClick={toggle}
                      >
                        {tc('event.follow.unfollow')}
                      </Button>
                    )
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
              </div>
            )}
          </>
        )}
        {children}
      </Stack>
    </Section>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'isomorphic-dompurify';

import { styled } from '/stitches.config';
import { Avatar } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

import Section, { Muted } from './Section';

const Row = styled(Link, {
  alignItems: 'center',
  color: 'inherit',
  display: 'flex',
  gap: '0.875rem',
  textDecoration: 'none',
  '&:hover strong': { textDecoration: 'underline' },
});

const Name = styled('strong', {
  display: 'block',
  fontSize: '1.05rem',
});

const ProfileLink = styled(Link, {
  color: 'var(--cocoso-colors-theme-700)',
  fontSize: '0.875rem',
});

const Bio = styled('p', {
  fontSize: '0.9rem',
  lineHeight: 1.5,
  margin: '0.875rem 0 0',
});

interface Organizer {
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: { src?: string };
}

const plainText = (html?: string) =>
  DOMPurify.sanitize(html || '', { ALLOWED_TAGS: [] }).trim();

// Who runs the event, with a way to their page and their other events.
export default function OrganizerSection({ username }: { username: string }) {
  const [tc] = useTranslation('common');
  const [organizer, setOrganizer] = useState<Organizer | null>(null);

  useEffect(() => {
    let cancelled = false;
    call<Organizer | null>('getUserInfo', username)
      .then((user) => !cancelled && setOrganizer(user))
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [username]);

  const fullName = [organizer?.firstName, organizer?.lastName]
    .filter(Boolean)
    .join(' ');
  const displayName = fullName || username;
  const bio = plainText(organizer?.bio);

  return (
    <Section order={6} title={tc('event.sections.organizer')}>
      <Row to={`/@${username}`}>
        <Avatar
          name={displayName}
          size="lg"
          src={getImageUrl(organizer?.avatar?.src, 'thumb')}
        />
        <span>
          <Name>{displayName}</Name>
          <Muted>@{username}</Muted>
        </span>
      </Row>
      {bio && <Bio>{bio}</Bio>}
      <Muted css={{ marginTop: '0.75rem' }}>
        <ProfileLink to={`/@${username}`}>
          {tc('event.organizer.profile', { name: displayName })}
        </ProfileLink>
      </Muted>
    </Section>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { Badge, Box, Loader, Modal, Text } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { sitePath } from '/imports/api/_utils/paths';
import { message } from '/imports/ui/generic/message';

interface UserEvent {
  _id: string;
  title: string;
  firstDate?: string;
  lastDate?: string;
  occasions: number;
  isCoOrganizer: boolean;
  isPublicActivity: boolean;
  isPublished: boolean;
  isArchived: boolean;
  isCancelled: boolean;
}

const day = (date?: string) => (date ? dayjs(date).format('D MMM YYYY') : '');

// Every event a member or an alias organizes or co-organizes, newest
// first, each a link to its page (getEventsOfUser). For the admin who is
// about to change someone's role, hand their events over or remove them.
export default function UserEvents({
  user,
  onClose,
}: {
  user: { id: string; username: string; name?: string } | null;
  onClose: () => void;
}) {
  const [t] = useTranslation('members');
  const [events, setEvents] = useState<UserEvent[] | null>(null);
  const userId = user?.id;

  useEffect(() => {
    let current = true;
    if (userId) {
      call<UserEvent[]>('getEventsOfUser', userId)
        .then((found) => current && setEvents(found))
        .catch((error: any) => {
          if (current) {
            setEvents([]);
            message.error(error?.reason || error?.error);
          }
        });
    }
    return () => {
      current = false;
      setEvents(null);
    };
  }, [userId]);

  const today = dayjs().format('YYYY-MM-DD');

  return (
    <Modal
      hideFooter
      id="user-events"
      open={Boolean(user)}
      size="lg"
      title={t('events.title', { name: user?.name || user?.username || '' })}
      onClose={onClose}
    >
      {!events && <Loader />}
      {events && events.length === 0 && <Text>{t('events.empty')}</Text>}
      {events && events.length > 0 && (
        <>
          <Box mb="4">
            <Text fontSize="sm">
              {t('events.count', {
                count: events.length,
                upcoming: events.filter(
                  (event) => (event.lastDate || '') >= today
                ).length,
              })}
            </Text>
          </Box>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {events.map((event) => (
              <li key={event._id} style={{ marginBottom: '0.75rem' }}>
                <Link
                  to={sitePath(
                    event.isPublicActivity ? 'activities' : 'calendar',
                    event._id
                  )}
                >
                  {event.title}
                </Link>
                {event.isCoOrganizer && (
                  <Badge size="sm" css={{ marginLeft: '0.5rem' }}>
                    {t('events.coOrganizer').toLowerCase()}
                  </Badge>
                )}
                {event.isCancelled && (
                  <Badge
                    colorScheme="red"
                    size="sm"
                    css={{ marginLeft: '0.5rem' }}
                  >
                    {t('events.cancelled').toLowerCase()}
                  </Badge>
                )}
                {event.isArchived && (
                  <Badge size="sm" css={{ marginLeft: '0.5rem' }}>
                    {t('events.archived').toLowerCase()}
                  </Badge>
                )}
                {!event.isPublished && (
                  <Badge size="sm" css={{ marginLeft: '0.5rem' }}>
                    {t('events.draft').toLowerCase()}
                  </Badge>
                )}
                <br />
                <Text fontSize="sm" color="gray.600">
                  {event.occasions > 1
                    ? t('events.dates', {
                        first: day(event.firstDate),
                        last: day(event.lastDate),
                        count: event.occasions,
                      })
                    : day(event.firstDate)}
                </Text>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

import React from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Text } from '/imports/ui/core';

interface Attendee {
  firstName?: string;
  lastName?: string;
  numberOfPeople?: number;
  isNameHidden?: boolean;
}

const block = { display: 'block' };

// The public list of who is coming. Names hidden by their owner arrive
// without a name from the server and are only counted.
export default function AttendeeNames({
  attendees,
}: {
  attendees?: Attendee[];
}) {
  const [t] = useTranslation('activities');
  const list = attendees || [];
  const people = (a: Attendee) => Number(a.numberOfPeople) || 1;
  const total = list.reduce((sum, a) => sum + people(a), 0);
  const named = list.filter(
    (a) => !a.isNameHidden && (a.firstName || a.lastName)
  );
  const hiddenCount = total - named.reduce((sum, a) => sum + people(a), 0);

  return (
    <Box>
      <Text css={block} fontWeight="bold" fontSize="sm">
        {t('public.attendance.label')} ({total})
      </Text>
      {total === 0 ? (
        <Text css={block} fontSize="sm" color="gray.600">
          {t('public.attendance.none')}
        </Text>
      ) : (
        <Text css={block} fontSize="sm">
          {named
            .map((a) => {
              const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
              return people(a) > 1 ? `${name} (+${people(a) - 1})` : name;
            })
            .join(', ')}
          {hiddenCount > 0 &&
            `${named.length > 0 ? ' ' : ''}${t('public.attendance.hidden', {
              count: hiddenCount,
            })}`}
        </Text>
      )}
    </Box>
  );
}

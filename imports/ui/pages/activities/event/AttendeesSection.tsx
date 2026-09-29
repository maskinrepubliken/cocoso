import React from 'react';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';

import Section, { Muted } from './Section';
import { Attendee, countPeople } from './occurrences';

const Names = styled('ul', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const Name = styled('li', {
  backgroundColor: 'var(--cocoso-colors-theme-50)',
  borderRadius: '999px',
  fontSize: '0.875rem',
  padding: '0.3rem 0.7rem',
});

const people = (a: Attendee) => Number(a.numberOfPeople) || 1;

// Who is coming to the selected date. Names hidden by their owner arrive
// from the server without a name and are only counted.
export default function AttendeesSection({
  attendees,
}: {
  attendees?: Attendee[];
}) {
  const [tc] = useTranslation('common');
  const list = attendees || [];
  const total = countPeople(list);
  const named = list.filter(
    (a) => !a.isNameHidden && (a.firstName || a.lastName)
  );
  const hiddenCount = total - named.reduce((sum, a) => sum + people(a), 0);

  return (
    <Section
      aside={total > 0 ? tc('event.attendees.count', { count: total }) : null}
      order={3}
      title={tc('event.sections.attendees')}
    >
      {total === 0 ? (
        <Muted>{tc('event.attendees.none')}</Muted>
      ) : (
        <>
          {named.length > 0 && (
            <Names>
              {named.map((a, i) => {
                const name = [a.firstName, a.lastName]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <Name key={`${name}-${i}`}>
                    {people(a) > 1 ? `${name} +${people(a) - 1}` : name}
                  </Name>
                );
              })}
            </Names>
          )}
          {hiddenCount > 0 && (
            <Muted css={{ marginTop: named.length > 0 ? '0.625rem' : 0 }}>
              {tc('event.attendees.hidden', { count: hiddenCount })}
            </Muted>
          )}
        </>
      )}
    </Section>
  );
}

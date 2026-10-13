import React from 'react';
import { useRevalidator, useSearchParams } from 'react-router';
import { CSVLink } from 'react-csv';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import { Button } from '/imports/ui/core';
import DeleteEntryHandler from '/imports/ui/entry/DeleteEntryHandler';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';

import Section, { Muted } from './Section';
import { Occurrence, countPeople } from './occurrences';

const Table = styled('table', {
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
  marginTop: '0.75rem',
  width: '100%',
  '& th, & td': {
    borderBottom: '1px solid var(--cocoso-colors-theme-100)',
    padding: '0.4rem 0.5rem 0.4rem 0',
    textAlign: 'left',
    verticalAlign: 'top',
  },
  '& th': { fontWeight: 600 },
});

const Scroll = styled('div', { overflowX: 'auto' });

const Buttons = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '1rem',
});

interface OrganizerToolsSectionProps {
  activity: {
    _id: string;
    title?: string;
    isPublicActivity?: boolean;
    isArchived?: boolean;
  };
  occurrence?: Occurrence | null;
}

// Only rendered for the organizer and admins, who get the attendees'
// emails from the server.
export default function OrganizerToolsSection({
  activity,
  occurrence,
}: OrganizerToolsSectionProps) {
  const [tc] = useTranslation('common');
  const [, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const attendees = occurrence?.attendees || [];

  const csvData = attendees.map((a) => ({
    [tc('event.register.firstName')]: a.firstName || '',
    [tc('event.register.lastName')]: a.lastName || '',
    [tc('event.register.email')]: a.email || '',
    [tc('event.tools.people')]: Number(a.numberOfPeople) || 1,
  }));
  const fileName = `${activity.title || 'event'} ${
    occurrence?.startDate || ''
  }.csv`;

  const setArchived = async (archived: boolean) => {
    try {
      await call(
        archived ? 'archiveActivity' : 'unarchiveActivity',
        activity._id
      );
      message.success(
        tc(archived ? 'event.tools.archived' : 'event.tools.unarchived')
      );
      revalidator.revalidate();
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  return (
    <Section
      aside={
        activity.isPublicActivity && attendees.length > 0
          ? tc('event.attendees.count', { count: countPeople(attendees) })
          : null
      }
      order={7}
      title={tc('event.sections.organizerTools')}
    >
      {activity.isPublicActivity && (
        <>
          <Muted>{tc('event.tools.intro')}</Muted>
          {attendees.length === 0 ? (
            <Muted css={{ marginTop: '0.75rem' }}>
              {tc('event.tools.noOne')}
            </Muted>
          ) : (
            <Scroll>
              <Table>
                <thead>
                  <tr>
                    <th>{tc('event.register.firstName')}</th>
                    <th>{tc('event.register.lastName')}</th>
                    <th>{tc('event.register.email')}</th>
                    <th>{tc('event.tools.people')}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a, i) => (
                    <tr key={`${a.email}-${i}`}>
                      <td>{a.firstName}</td>
                      <td>
                        {a.lastName}
                        {a.isNameHidden ? ' 🔒' : ''}
                      </td>
                      <td>{a.email}</td>
                      <td>{Number(a.numberOfPeople) || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Scroll>
          )}
        </>
      )}

      <Buttons>
        {activity.isPublicActivity && attendees.length > 0 && (
          <CSVLink data={csvData} filename={fileName} target="_blank">
            <Button size="sm" variant="outline">
              {tc('actions.downloadCSV')}
            </Button>
          </CSVLink>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSearchParams({ edit: 'true' })}
        >
          {tc('event.tools.edit')}
        </Button>
        {activity.isArchived ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setArchived(false)}
            >
              {tc('event.tools.unarchive')}
            </Button>
            <Button
              colorScheme="red"
              size="sm"
              variant="ghost"
              onClick={() => setSearchParams({ delete: 'true' })}
            >
              {tc('event.tools.remove')}
            </Button>
          </>
        ) : (
          <Button
            colorScheme="red"
            size="sm"
            variant="ghost"
            onClick={() => setArchived(true)}
          >
            {tc('event.tools.archive')}
          </Button>
        )}
      </Buttons>
      {!activity.isArchived && (
        <Muted css={{ marginTop: '0.5rem' }}>
          {tc('event.tools.archiveFirst')}
        </Muted>
      )}

      <DeleteEntryHandler context="activities" item={activity as any} />
    </Section>
  );
}

import React from 'react';
import dayjs from 'dayjs';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';

import { styled } from '/stitches.config';
import { formatAddress, type Address } from '/imports/api/_utils/address';

export interface GroupMeeting {
  meetingId?: string;
  meetingTitle?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  resource?: string;
  place?: string;
  address?: Partial<Address> | null;
  attendees?: { username?: string }[];
}

const List = styled('ul', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const Row = styled('li', {
  alignItems: 'center',
  flexWrap: 'wrap',
  display: 'flex',
  gap: '1rem',
});

// The day as on a wall calendar: the number large, the month small
const Day = styled('span', {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-colors-theme-100)',
  borderRadius: '12px',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  justifyContent: 'center',
  lineHeight: 1.05,
  padding: '0.45rem 0',
  width: '3.5rem',
  '& strong': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.5rem',
  },
  '& small': {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
});

const What = styled('div', {
  flex: '1 1 auto',
  minWidth: 0,
  '& strong': {
    color: 'var(--cocoso-colors-theme-900)',
    display: 'block',
    fontSize: '1.05rem',
  },
  '& span': {
    alignItems: 'center',
    color: 'var(--cocoso-mylla-soft)',
    display: 'flex',
    fontSize: '0.92rem',
    gap: '0.3rem',
  },
  '& svg': { flexShrink: 0, height: '0.9rem', width: '0.9rem' },
});

const whereOf = (meeting: GroupMeeting) =>
  meeting.resource || meeting.place || formatAddress(meeting.address) || '';

// A group's coming meetings on its page: each one's day, its name, its
// time and where it is.
export default function GroupMeetingList({
  actions,
  meetings,
  groupTitle,
}: {
  meetings: GroupMeeting[];
  groupTitle?: string;
  // At the end of each row, e.g. joining it or removing it
  actions?: (meeting: GroupMeeting) => React.ReactNode;
}) {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const coming = meetings.filter(
    (meeting) => (meeting.endDate || meeting.startDate) > yesterday
  );
  if (coming.length === 0) {
    return null;
  }

  return (
    <List>
      {coming.map((meeting) => {
        const day = dayjs(meeting.startDate, 'YYYY-MM-DD');
        return (
          <Row key={meeting.meetingId || meeting.startDate + meeting.startTime}>
            <Day aria-hidden>
              <strong>{day.format('D')}</strong>
              <small>{day.format('MMM')}</small>
            </Day>
            <What>
              <strong>{meeting.meetingTitle || groupTitle}</strong>
              <span>
                {day.format('dddd D MMMM')}
                {meeting.startTime &&
                  `, ${meeting.startTime}${
                    meeting.endTime ? `–${meeting.endTime}` : ''
                  }`}
              </span>
              {whereOf(meeting) && (
                <span>
                  <MapPinIcon aria-hidden />
                  {whereOf(meeting)}
                </span>
              )}
            </What>
            {actions?.(meeting)}
          </Row>
        );
      })}
    </List>
  );
}

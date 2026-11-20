import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import { call } from '/imports/api/_utils/shared';
import { kindsOf } from '/imports/api/_utils/kinds';
import { sitePath } from '/imports/api/_utils/paths';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import useOpenEntry from '/imports/ui/listing/useOpenEntry';

import { Muted } from './Section';

const shown = 3;

// The listing's cards, here always filling the row
const EventCards = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
});

const Box = styled('section', {
  borderTop: '1px solid var(--cocoso-colors-theme-200)',
  marginTop: '3rem',
  paddingTop: '2rem',
});

const Head = styled('div', {
  alignItems: 'baseline',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem 1.5rem',
  justifyContent: 'space-between',
  marginBottom: '0.35rem',
  '& h2': {
    color: 'var(--cocoso-colors-theme-800)',
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.6rem',
    fontVariationSettings: '"SOFT" 60',
    fontWeight: 600,
    margin: 0,
  },
  '& a': {
    color: 'var(--cocoso-colors-theme-700)',
    fontFamily: 'var(--cocoso-font-ui)',
    fontSize: '0.95rem',
    fontWeight: 700,
  },
});

interface MoreEventsProps {
  activity: {
    _id: string;
    resourceId?: string;
    locationId?: string;
    kinds?: string[] | null;
    category?: { key?: string } | null;
  };
  siteName?: string;
}

// Under the event: a few more that are coming up, and the way to all of
// them. Most visitors arrive on an event's page from a shared link and
// have not seen the rest of the site. The nearest in kind come first:
// the same place, then the same kind of event, then the same ort.
// Loaded in the browser, after the event itself.
export default function MoreEvents({ activity, siteName }: MoreEventsProps) {
  const [tc] = useTranslation('common');
  const openEntry = useOpenEntry('activities');
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    let current = true;
    call('getAllPublicActivities', false)
      .then((found) => {
        if (!current) return;
        const kinds = kindsOf(activity);
        const nearness = (item: any) =>
          (activity.resourceId && item.resourceId === activity.resourceId
            ? 4
            : 0) +
          (kindsOf(item).some((kind) => kinds.includes(kind)) ? 2 : 0) +
          (activity.locationId && item.locationId === activity.locationId
            ? 1
            : 0);
        const others = (found as any[]).filter(
          (item) =>
            item._id !== activity._id &&
            item.isPublicActivity &&
            !item.cancelledAt
        );
        // The method returns them soonest first; the sort keeps that
        // order among equals
        setEvents(
          [...others].sort((a, b) => nearness(b) - nearness(a)).slice(0, shown)
        );
      })
      .catch(() => setEvents([]));
    return () => {
      current = false;
    };
  }, [activity._id]);

  if (events.length === 0) {
    return null;
  }

  return (
    <Box>
      <Head>
        <h2>{tc('event.more.title')}</h2>
        <Link to={sitePath('activities')}>{tc('event.more.all')} →</Link>
      </Head>
      {siteName && (
        <Muted css={{ fontSize: '1rem', marginBottom: '1.25rem' }}>
          {tc('event.more.intro', { site: siteName })}
        </Muted>
      )}
      <EventCards>
        {events.map((item, index) => (
          <div
            key={item._id}
            style={{ cursor: 'pointer' }}
            onClick={() => openEntry(item)}
          >
            <SexyThumb activity={item} index={index} />
          </div>
        ))}
      </EventCards>
    </Box>
  );
}

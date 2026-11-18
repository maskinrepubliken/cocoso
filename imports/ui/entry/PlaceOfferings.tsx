import React from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { styled } from '/stitches.config';
import { hasContact, type Contact } from '/imports/api/_utils/contact';
import { ContactDetails } from '/imports/ui/generic/ContactDetails';
import {
  type Opening,
  WEEK,
  formatDay,
  formatTime,
  isoDay,
  openState,
  useNow,
} from '/imports/ui/pages/businesses/hours';

import { EntryColumn, Panel, RichText, SectionHead } from './EntryHero';

export interface PlaceOffering {
  _id: string;
  kind: string;
  title?: string;
  description?: string;
  contact?: Contact | null;
  openingHours?: Opening[];
  hoursNote?: string;
}

// Open or closed, with a dot: green when open
export const Status = styled('span', {
  alignItems: 'center',
  display: 'inline-flex',
  fontWeight: 600,
  gap: '0.35rem',
  '&::before': {
    borderRadius: '50%',
    content: '""',
    height: '0.55rem',
    width: '0.55rem',
  },
  variants: {
    open: {
      true: {
        color: 'var(--cocoso-colors-theme-800)',
        '&::before': { backgroundColor: '#3c9a4a' },
      },
      false: {
        color: 'var(--cocoso-mylla-soft)',
        '&::before': { backgroundColor: '#b9b0a2' },
      },
    },
  },
});

const Layout = styled('div', {
  display: 'grid',
  gap: '1.5rem',
  gridTemplateColumns: 'minmax(0, 1fr)',
  '@media (min-width: 760px)': {
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(220px, 1fr)',
  },
});

const Small = styled('h3', {
  color: 'var(--cocoso-tegel)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  margin: '0 0 0.75rem',
  textTransform: 'uppercase',
});

const Days = styled('dl', {
  display: 'grid',
  gap: '0.3rem 1rem',
  gridTemplateColumns: 'auto 1fr',
  margin: 0,
  '& dt': { textTransform: 'capitalize' },
  '& dd': { margin: 0, textAlign: 'right' },
  '& .today': { fontWeight: 700 },
  '& .closed': { color: 'var(--cocoso-mylla-soft)' },
});

const Note = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.88rem',
  margin: '0.75rem 0 0',
});

const weekdayName = (day: number) =>
  dayjs()
    .day(day % 7)
    .format('dddd');

// The week's hours, today in bold, and whether it is open now (worked out
// in the browser only: the server may be in another time zone)
export function OfferingHours({
  hours,
  note,
}: {
  hours?: Opening[];
  note?: string;
}) {
  const [tc] = useTranslation('common');
  const now = useNow();
  const today = now ? isoDay(now) : null;
  const state = now && hours?.length ? openState(hours, now) : null;

  return (
    <div>
      <Small>{tc('businesses.hours')}</Small>
      {state && (
        <p style={{ margin: '0 0 0.75rem' }}>
          {state.open ? (
            <Status open>
              {tc('businesses.openNow')} ·{' '}
              {tc('businesses.closesAt', { time: formatTime(state.closes) })}
            </Status>
          ) : (
            <Status open={false}>
              {tc('businesses.closedNow')}
              {state.next &&
                ` · ${tc('businesses.opensAt', {
                  day:
                    state.next.day === today
                      ? tc('businesses.today').toLowerCase()
                      : weekdayName(state.next.day),
                  time: formatTime(state.next.opens),
                })}`}
            </Status>
          )}
        </p>
      )}
      {hours && hours.length > 0 && (
        <Days>
          {WEEK.map((day) => {
            const text = formatDay(hours, day);
            const classes = [day === today ? 'today' : '', text ? '' : 'closed']
              .filter(Boolean)
              .join(' ');
            return (
              <React.Fragment key={day}>
                <dt className={classes}>
                  {day === today ? tc('businesses.today') : weekdayName(day)}
                </dt>
                <dd className={classes}>{text || tc('businesses.closed')}</dd>
              </React.Fragment>
            );
          })}
        </Days>
      )}
      {note && <Note>{note}</Note>}
    </div>
  );
}

// What the place offers, as part of its page and in its order: a section
// for each, headed by its name or else its kind (Mat & fika, Boende …),
// with what is offered and how to reach it beside its own opening hours.
// One without hours or contact of its own goes by the place's, shown
// beside the page.
export default function PlaceOfferings({
  offerings,
}: {
  offerings?: PlaceOffering[];
}) {
  const [tc] = useTranslation('common');
  const sorted = offerings || [];

  return (
    <>
      {sorted.map((offering) => {
        const withHours = Boolean(
          Array.isArray(offering.openingHours) &&
            (offering.openingHours.length || offering.hoursNote)
        );
        const withContact = hasContact(offering.contact);
        return (
          <EntryColumn key={offering._id}>
            <SectionHead>
              <h2>
                {offering.title || tc(`offerings.kinds.${offering.kind}`)}
              </h2>
            </SectionHead>
            <Panel>
              <Layout
                css={withHours ? undefined : { gridTemplateColumns: '1fr' }}
              >
                <div>
                  {offering.description && (
                    <RichText className="text-content">
                      {HTMLReactParser(
                        DOMPurify.sanitize(offering.description)
                      )}
                    </RichText>
                  )}
                  {withContact && (
                    <div style={{ marginTop: '1rem' }}>
                      <ContactDetails contact={offering.contact} />
                    </div>
                  )}
                </div>
                {withHours && (
                  <OfferingHours
                    hours={offering.openingHours}
                    note={offering.hoursNote}
                  />
                )}
              </Layout>
            </Panel>
          </EntryColumn>
        );
      })}
    </>
  );
}

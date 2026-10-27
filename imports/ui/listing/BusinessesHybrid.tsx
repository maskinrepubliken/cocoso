import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import LandmarkIcon from 'lucide-react/dist/esm/icons/landmark';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';

import { styled } from '/stitches.config';
import { locationsAtom, siteAtom } from '/imports/state';
import { formatAddress } from '/imports/api/_utils/address';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';
import { worldForLocation } from '/imports/ui/utils/locationPalette';
import {
  formatDay,
  formatTime,
  isoDay,
  openState,
  useNow,
} from '/imports/ui/pages/businesses/hours';

import PageHeading from './PageHeading';

// Äta/handla/bo: cafés, restaurants, shops and inns. Where something is
// matters more than what it is, so the page opens with a choice of place
// and the cards come grouped by place. Each card tells enough to decide
// without opening it: what it is, whether it is open, today's hours and a
// taste of the menu, range or rooms with prices.

// Menu lines shown on a card.
const TASTE = 3;

const Page = styled('div', {
  boxSizing: 'border-box',
  margin: '0 auto',
  maxWidth: 'calc(var(--cocoso-page, 1180px) + 2 * var(--cocoso-gutter, 1rem))',
  padding: '0 var(--cocoso-gutter, 1rem) 3rem',
  width: '100%',
});

const Picker = styled('nav', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  justifyContent: 'center',
  margin: '0 auto 1.25rem',
  maxWidth: '900px',
});

const Choice = styled(Link, {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-papper)',
  border: '2px solid transparent',
  borderRadius: '999px',
  boxShadow: 'var(--cocoso-skugga)',
  color: 'var(--ink)',
  display: 'inline-flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '1rem',
  fontWeight: 700,
  gap: '0.5rem',
  minHeight: '44px',
  padding: '0.3rem 0.9rem 0.3rem 0.35rem',
  textDecoration: 'none',
  transition: 'transform 0.15s ease, border-color 0.15s ease',
  '&:hover': { borderColor: 'var(--tint)', transform: 'translateY(-1px)' },
  '& .mark': {
    alignItems: 'center',
    backgroundColor: 'var(--tint)',
    borderRadius: '999px',
    color: 'var(--ink)',
    display: 'inline-flex',
    fontSize: '0.8rem',
    height: '32px',
    justifyContent: 'center',
    width: '32px',
  },
  '& .count': {
    color: 'var(--cocoso-mylla-soft)',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  variants: {
    current: {
      true: {
        backgroundColor: 'var(--ink)',
        color: 'var(--cocoso-papper)',
        '& .mark': { backgroundColor: 'var(--cocoso-papper)' },
        '& .count': { color: 'var(--cocoso-papper)', opacity: 0.8 },
      },
    },
    empty: {
      true: { opacity: 0.6 },
    },
  },
});

const Notice = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.85rem',
  fontStyle: 'italic',
  margin: '0 auto 1.5rem',
  maxWidth: '60ch',
  textAlign: 'center',
});

const Section = styled('section', {
  marginBottom: '2.5rem',
});

const SectionHead = styled('div', {
  alignItems: 'baseline',
  borderBottom: '1px solid var(--cocoso-colors-theme-200, rgba(0,0,0,0.1))',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem 0.75rem',
  marginBottom: '1rem',
  paddingBottom: '0.5rem',
  '& h2': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.6rem',
    fontVariationSettings: '"SOFT" 60',
    fontWeight: 600,
    margin: 0,
  },
  '& .count': {
    color: 'var(--cocoso-mylla-soft)',
    fontSize: '0.9rem',
  },
  '& a': {
    color: 'var(--cocoso-colors-theme-800)',
    fontSize: '0.9rem',
    fontWeight: 700,
    marginLeft: 'auto',
  },
});

const Stamp = styled('span', {
  alignItems: 'center',
  borderRadius: '999px',
  display: 'inline-flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.9rem',
  fontWeight: 700,
  height: '1.8rem',
  justifyContent: 'center',
  marginRight: '0.5rem',
  verticalAlign: '0.2em',
  width: '1.8rem',
});

const Cards = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 480px), 1fr))',
});

const Card = styled(Link, {
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: 'var(--cocoso-radius-kort, 12px)',
  boxShadow: 'var(--cocoso-skugga-kort, var(--cocoso-skugga))',
  color: 'inherit',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  overflow: 'hidden',
  textDecoration: 'none',
  transition: 'transform 0.15s ease',
  '&:hover': { transform: 'translateY(-2px)' },
  '&:hover h3': { textDecoration: 'underline' },
  '@media (min-width: 560px)': {
    gridTemplateColumns: '38% minmax(0, 1fr)',
  },
});

const Picture = styled('div', {
  aspectRatio: '16 / 9',
  overflow: 'hidden',
  position: 'relative',
  '& > img, & > svg': {
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
  '@media (min-width: 560px)': {
    aspectRatio: 'auto',
    minHeight: '100%',
    '& > img, & > svg': { position: 'absolute', inset: 0 },
  },
});

const Body = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
  padding: '0.9rem 1rem 1rem',
  '& h3': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.3rem',
    fontVariationSettings: '"SOFT" 60',
    fontWeight: 600,
    lineHeight: 1.2,
    margin: 0,
  },
});

const Kinds = styled('div', {
  color: 'var(--cocoso-colors-theme-800)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
});

const Tagline = styled('p', {
  fontSize: '0.95rem',
  fontWeight: 600,
  margin: 0,
});

const Excerpt = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  display: '-webkit-box',
  fontSize: '0.9rem',
  lineHeight: 1.45,
  margin: 0,
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
});

const Taste = styled('div', {
  borderTop: '1px dashed var(--cocoso-colors-theme-200, rgba(0,0,0,0.15))',
  fontSize: '0.85rem',
  paddingTop: '0.45rem',
  '& .title': {
    color: 'var(--cocoso-mylla-soft)',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    marginBottom: '0.2rem',
    textTransform: 'uppercase',
  },
  '& ul': { listStyle: 'none', margin: 0, padding: 0 },
  '& li': {
    display: 'flex',
    gap: '0.5rem',
    lineHeight: 1.5,
  },
  '& .name': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .dots': {
    borderBottom: '1px dotted var(--cocoso-mylla-soft)',
    flex: 1,
    marginBottom: '0.35rem',
    minWidth: '1rem',
    opacity: 0.5,
  },
  '& .price': { fontWeight: 600, whiteSpace: 'nowrap' },
});

const Facts = styled('div', {
  color: 'var(--cocoso-mylla-soft)',
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: '0.82rem',
  gap: '0.2rem 0.9rem',
  marginTop: 'auto',
  paddingTop: '0.3rem',
  '& span': { alignItems: 'center', display: 'inline-flex', gap: '0.3rem' },
});

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

const StatusLine = styled('div', {
  fontSize: '0.85rem',
  minHeight: '1.3em',
});

function OpenStatus({ business }: { business: any }) {
  const { t } = useTranslation('common');
  const now = useNow();
  if (!now || !business.openingHours?.length) {
    return null;
  }
  const state = openState(business.openingHours, now);
  const today = formatDay(business.openingHours, isoDay(now));
  if (state.open) {
    return (
      <Status open>
        {t('businesses.openNow')} ·{' '}
        {t('businesses.closesAt', { time: formatTime(state.closes) })}
        {today && ` · ${t('businesses.todayHours', { hours: today })}`}
      </Status>
    );
  }
  return (
    <Status open={false}>
      {today
        ? `${t('businesses.closedNow')} · ${t('businesses.todayHours', { hours: today })}`
        : t('businesses.closedToday')}
    </Status>
  );
}

// The first paragraph of the description as text; later paragraphs are
// often photo credits.
const firstParagraph = (html?: string) => {
  const first = (html || '').match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? html;
  return (first || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// A few lines from the menu, preferring ones with a price.
const tasteOf = (menu?: any[]) => {
  const items = (menu || []).flatMap((section) => section.items || []);
  const priced = items.filter((item) => item.price);
  return (priced.length >= TASTE ? priced : items).slice(0, TASTE);
};

function BusinessCard({ business }: { business: any }) {
  const { t } = useTranslation('common');
  const locations = useAtomValue(locationsAtom);
  const image = business.images?.[0];
  const place = locations.find((l: any) => l._id === business.locationId);
  const prefix = place ? `/${place.slug}` : '';
  const excerpt = firstParagraph(business.description);
  const taste = tasteOf(business.menu);
  const address = formatAddress(business.address);
  const phone = business.contact?.phone;

  return (
    <Card to={`${prefix}/businesses/${business._id}`}>
      <Picture>
        {image ? (
          <img
            alt=""
            loading="lazy"
            src={getImageUrl(image, 'small') || image}
          />
        ) : (
          <PlaceholderImage seed={business._id} />
        )}
      </Picture>
      <Body>
        <Kinds>
          {business.kinds
            ?.map((k: string) => t(`businesses.kinds.${k}`))
            .join(' · ')}
        </Kinds>
        <h3>{business.label}</h3>
        {business.tagline && <Tagline>{business.tagline}</Tagline>}
        {excerpt && <Excerpt>{excerpt}</Excerpt>}
        <StatusLine>
          <OpenStatus business={business} />
        </StatusLine>
        {taste.length > 0 && (
          <Taste>
            <div className="title">
              {t(`businesses.menu.${business.kinds?.[0] || 'eat'}`)}
            </div>
            <ul>
              {taste.map((item: any, i: number) => (
                <li key={`${item.name}-${i}`}>
                  <span className="name">{item.name}</span>
                  {item.price && (
                    <>
                      <span className="dots" />
                      <span className="price">{item.price}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Taste>
        )}
        {(address || phone || business.hoursNote) && (
          <Facts>
            {address && (
              <span>
                <MapPinIcon width={13} height={13} />
                {address}
              </span>
            )}
            {phone && (
              <span>
                <PhoneIcon width={13} height={13} />
                {phone}
              </span>
            )}
            {business.hoursNote && <span>{business.hoursNote}</span>}
          </Facts>
        )}
      </Body>
    </Card>
  );
}

export interface BusinessesHybridProps {
  siteDoc: any;
  businesses: any[];
}

export default function BusinessesHybrid({
  siteDoc,
  businesses,
}: BusinessesHybridProps) {
  const { t } = useTranslation('common');
  const site = useAtomValue(siteAtom);
  const locations = useAtomValue(locationsAtom);
  const current = useCurrentLocation();

  const all = businesses || [];
  const hasExamples = all.some((b) => b.isExample);
  const inPlace = (id: string) => all.filter((b) => b.locationId === id);
  const placed = new Set(locations.map((l: any) => l._id));
  // Out in the countryside, or in a place that is not published.
  const around = all.filter(
    (b) => !b.locationId || !placed.has(b.locationId)
  );

  // At the root every place gets its section; inside a place, that place
  // and what lies around it.
  const sections = (current ? [current] : locations).map((location: any) => ({
    key: location._id,
    location,
    items: inPlace(location._id),
  }));

  return (
    <>
      {/* The picker below says which place is chosen. */}
      <PageHeading site={site || siteDoc} listing="businesses" hidePlace />

      <Page>
        <Picker aria-label={t('locations.switcher.choose')}>
          <Choice
            current={!current}
            preventScrollReset
            style={
              {
                '--ink': 'var(--cocoso-colors-theme-800)',
                '--tint': 'var(--cocoso-colors-theme-100)',
              } as React.CSSProperties
            }
            to="/businesses"
          >
            <span className="mark">
              <LandmarkIcon width={16} height={16} />
            </span>
            {t('locations.switcher.whole')}
            <span className="count">{all.length}</span>
          </Choice>
          {locations.map((location: any) => {
            const world = worldForLocation(locations, location._id);
            const count = inPlace(location._id).length;
            return (
              <Choice
                key={location._id}
                current={current?._id === location._id}
                empty={count === 0}
                preventScrollReset
                style={
                  {
                    '--ink': world?.ink,
                    '--tint': world?.tint,
                  } as React.CSSProperties
                }
                to={`/${location.slug}/businesses`}
              >
                <span className="mark">
                  {location.name.trim().charAt(0).toUpperCase()}
                </span>
                {location.name}
                <span className="count">{count}</span>
              </Choice>
            );
          })}
        </Picker>

        {hasExamples && <Notice>{t('businesses.example')}</Notice>}

        {sections.map(({ key, location, items }) =>
          items.length === 0 && !current ? null : (
            <Section key={key}>
              <SectionHead>
                <h2>
                  <Stamp
                    style={{
                      background: worldForLocation(locations, location._id)
                        ?.tint,
                      color: worldForLocation(locations, location._id)?.ink,
                    }}
                  >
                    {location.name.trim().charAt(0).toUpperCase()}
                  </Stamp>
                  {location.name}
                </h2>
                <span className="count">
                  {t('businesses.count', { count: items.length })}
                </span>
              </SectionHead>
              {items.length === 0 ? (
                <Notice>
                  {t('businesses.emptyIn', { name: location.name })}
                </Notice>
              ) : (
                <Cards>
                  {items.map((business) => (
                    <BusinessCard key={business._id} business={business} />
                  ))}
                </Cards>
              )}
            </Section>
          )
        )}

        {around.length > 0 && (
          <Section>
            <SectionHead>
              <h2>{t('businesses.around')}</h2>
              <span className="count">
                {t('businesses.count', { count: around.length })}
              </span>
            </SectionHead>
            <Cards>
              {around.map((business) => (
                <BusinessCard key={business._id} business={business} />
              ))}
            </Cards>
          </Section>
        )}

        {all.length === 0 && <Notice>{t('businesses.empty')}</Notice>}
      </Page>
    </>
  );
}

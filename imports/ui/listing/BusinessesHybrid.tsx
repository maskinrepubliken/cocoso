import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';

import { styled } from '/stitches.config';
import { locationsAtom, siteAtom } from '/imports/state';
import { formatAddress } from '/imports/api/_utils/address';
import PlaceTag from '/imports/ui/generic/PlaceTag';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import ThreeDIcon, { type ThreeDIconName } from '/imports/ui/generic/ThreeDIcon';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';
import { worldForLocation } from '/imports/ui/utils/locationPalette';
import { LocationCards } from '/imports/ui/pages/locations/LocationsGrid';
import {
  formatDay,
  formatTime,
  isoDay,
  openState,
  useNow,
} from '/imports/ui/pages/businesses/hours';

import PageHeading from './PageHeading';

// Äta/handla/bo: cafés, restaurants, shops and inns. Where something is
// matters most, so the page opens with a choice of place; below it the
// cards come under Äta, Handla and Bo. Each card tells enough to decide
// without opening it: what it is, whether it is open, today's hours and a
// taste of the menu, range or rooms with prices.

// Menu lines shown on a card.
const TASTE = 3;

const KINDS = ['eat', 'shop', 'stay'] as const;

type Kind = (typeof KINDS)[number];

// Each kind's icon, colour (from the logo's letters) and paper tint.
const KIND_LOOK: Record<Kind, { icon: ThreeDIconName; ink: string; tint: string }> = {
  eat: { icon: 'cup', ink: '#c4512f', tint: '#fdf3ed' },
  shop: { icon: 'bag', ink: '#2f6fa3', tint: '#eef4fa' },
  stay: { icon: 'key', ink: '#7a4f9a', tint: '#f5f0f8' },
};

const lookOf = (kind?: string) => KIND_LOOK[kind as Kind] || KIND_LOOK.eat;

const kindVars = (kind?: string) =>
  ({
    '--kind': lookOf(kind).ink,
    '--kind-tint': lookOf(kind).tint,
  }) as React.CSSProperties;

const Page = styled('div', {
  boxSizing: 'border-box',
  margin: '0 auto',
  maxWidth: 'calc(var(--cocoso-page, 1180px) + 2 * var(--cocoso-gutter, 1rem))',
  padding: '0 var(--cocoso-gutter, 1rem) 3rem',
  width: '100%',
});

// The start page's place cards, smaller, as the picker.
const Picker = styled('nav', {
  marginBottom: '1.25rem',
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

// A quiet label over each kind's cards; the cards' colour does the work.
const SectionHead = styled('div', {
  alignItems: 'center',
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '0.6rem',
  '& h2': {
    color: 'var(--kind)',
    fontFamily: 'var(--cocoso-font-ui)',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    margin: 0,
    textTransform: 'uppercase',
  },
  '& .count': {
    color: 'var(--cocoso-mylla-soft)',
    fontSize: '0.8rem',
  },
  '&::after': {
    backgroundColor: 'var(--kind)',
    content: '""',
    flex: 1,
    height: '1px',
    opacity: 0.3,
  },
});

const KindIcon = styled('span', {
  alignItems: 'center',
  backgroundColor: 'rgba(255, 253, 247, 0.94)',
  borderRadius: '999px',
  bottom: '0.6rem',
  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
  display: 'inline-flex',
  gap: '0.1rem',
  padding: '0.2rem',
  position: 'absolute',
  right: '0.6rem',
  zIndex: 1,
  '& img': { height: '30px', width: '30px' },
});

const OnPicture = styled('div', {
  left: '0.6rem',
  position: 'absolute',
  top: '0.6rem',
  zIndex: 1,
});

const Cards = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 480px), 1fr))',
});

// Each card takes its first kind's colour: a band along the top and a
// faint tint on the paper, so Äta, Handla and Bo read apart at a glance.
const Card = styled(Link, {
  backgroundColor: 'var(--kind-tint)',
  borderRadius: 'var(--cocoso-radius-kort, 12px)',
  borderTop: '5px solid var(--kind)',
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
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.3rem',
  '& span': {
    backgroundColor: 'var(--k)',
    borderRadius: '999px',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    padding: '0.15rem 0.55rem',
    textTransform: 'uppercase',
  },
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

function BusinessCard({
  business,
  showPlace,
}: {
  business: any;
  // The place's tag on the picture, when the page is not already one place
  showPlace: boolean;
}) {
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
    <Card
      style={kindVars(business.kinds?.[0])}
      to={`${prefix}/businesses/${business._id}`}
    >
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
        {showPlace && place && (
          <OnPicture>
            <PlaceTag
              name={place.name}
              onImage
              world={worldForLocation(locations, place._id)}
            />
          </OnPicture>
        )}
        <KindIcon>
          {business.kinds?.map((k: string) => (
            <ThreeDIcon key={k} name={lookOf(k).icon} size={30} />
          ))}
        </KindIcon>
      </Picture>
      <Body>
        <Kinds>
          {business.kinds?.map((k: string) => (
            <span
              key={k}
              style={{ '--k': lookOf(k).ink } as React.CSSProperties}
            >
              {t(`businesses.kinds.${k}`)}
            </span>
          ))}
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

  // The picker chooses the place; below it the cards come in Äta, Handla
  // and Bo order. Something that is several kinds, like a manor with a
  // restaurant and rooms, is shown once, under its first kind.
  const shown = current ? inPlace(current._id) : all;
  const sections = KINDS.map((kind) => ({
    kind,
    items: shown.filter((b) => (b.kinds?.[0] || 'eat') === kind),
  })).filter(({ items }) => items.length > 0);

  return (
    <>
      {/* The picker below says which place is chosen. */}
      <PageHeading site={site || siteDoc} listing="businesses" hidePlace />

      <Page>
        <Picker aria-label={t('locations.switcher.choose')}>
          <LocationCards
            all={{
              count: all.length,
              name: t('locations.switcher.whole'),
              to: '/businesses',
            }}
            compact
            counts={Object.fromEntries(
              locations.map((l: any) => [l._id, inPlace(l._id).length])
            )}
            currentId={current?._id ?? null}
            locations={locations}
            section="businesses"
          />
        </Picker>

        {hasExamples && <Notice>{t('businesses.example')}</Notice>}

        {sections.map(({ kind, items }) => (
          <Section key={kind} style={kindVars(kind)}>
            <SectionHead>
              <ThreeDIcon name={lookOf(kind).icon} size={22} />
              <h2>{t(`businesses.kinds.${kind}`)}</h2>
              <span className="count">
                {t('businesses.count', { count: items.length })}
              </span>
            </SectionHead>
            <Cards>
              {items.map((business) => (
                <BusinessCard
                  key={business._id}
                  business={business}
                  showPlace={!current}
                />
              ))}
            </Cards>
          </Section>
        ))}

        {shown.length === 0 && (
          <Notice>
            {current
              ? t('businesses.emptyIn', { name: current.name })
              : t('businesses.empty')}
          </Notice>
        )}
      </Page>
    </>
  );
}

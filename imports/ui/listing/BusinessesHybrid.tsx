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
// matters most, so the page opens with the start page's place cards as a
// picker; below it the places come under Äta, Handla and Bo. The cards
// speak the same picture language as the place cards — a photo with the
// name over a dark fade — and say enough to decide without opening them:
// whether it is open, a few lines about it and a taste of the menu, range
// or rooms. The kind is said by the label over each group.

// Menu lines shown on a card.
const TASTE = 3;

const KINDS = ['eat', 'shop', 'stay'] as const;

type Kind = (typeof KINDS)[number];

// Each kind's colour, from the letters of the logo, and the light end of
// the gradient behind a card without a photo.
const KIND_LOOK: Record<Kind, { ink: string; light: string }> = {
  eat: { ink: '#c4512f', light: '#f3cdb8' },
  shop: { ink: '#2f6fa3', light: '#c4dbee' },
  stay: { ink: '#7a4f9a', light: '#dccbe8' },
};

const lookOf = (kind?: string) => KIND_LOOK[kind as Kind] || KIND_LOOK.eat;

const kindVars = (kind?: string) =>
  ({
    '--kind': lookOf(kind).ink,
    '--kind-light': lookOf(kind).light,
  }) as React.CSSProperties;

const Page = styled('div', {
  boxSizing: 'border-box',
  margin: '0 auto',
  maxWidth: 'calc(var(--cocoso-page, 1180px) + 2 * var(--cocoso-gutter, 1rem))',
  padding: '0 var(--cocoso-gutter, 1rem) 3rem',
  width: '100%',
});

const Picker = styled('nav', {
  marginBottom: '1.25rem',
});

const Notice = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.85rem',
  fontStyle: 'italic',
  margin: '0 auto 1.75rem',
  maxWidth: '60ch',
  textAlign: 'center',
});

const Section = styled('section', {
  marginBottom: '2.25rem',
});

// A quiet label over each kind; the cards themselves carry the colour.
const SectionHead = styled('h2', {
  alignItems: 'baseline',
  color: 'var(--kind)',
  display: 'flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.8rem',
  fontWeight: 700,
  gap: '0.5rem',
  letterSpacing: '0.08em',
  margin: '0 0 0.75rem',
  textTransform: 'uppercase',
  '& .count': {
    color: 'var(--cocoso-mylla-soft)',
    fontWeight: 600,
    letterSpacing: 0,
    textTransform: 'none',
  },
});

const Cards = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))',
});

const Card = styled(Link, {
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: 'var(--cocoso-radius-kort, 12px)',
  boxShadow: 'var(--cocoso-skugga-kort, var(--cocoso-skugga))',
  color: 'inherit',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  textDecoration: 'none',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  '&:hover': {
    boxShadow: '0 16px 28px -14px rgba(60, 40, 20, 0.55)',
    transform: 'translateY(-3px)',
  },
  '&:hover h3': { textDecoration: 'underline' },
});

// The photo with the name over a dark fade, as on the place cards. Without
// a photo, generated shapes on a gradient in the kind's colour.
const Picture = styled('div', {
  aspectRatio: '4 / 3',
  // One card per row on a phone: a lower picture keeps it from filling the
  // screen.
  '@media (max-width: 559px)': { aspectRatio: '16 / 9' },
  background:
    'linear-gradient(135deg, var(--kind-light), var(--kind)) center / cover',
  overflow: 'hidden',
  position: 'relative',
  '& > img': {
    display: 'block',
    height: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    width: '100%',
  },
  '& > .shapes': {
    height: '100%',
    inset: 0,
    mixBlendMode: 'multiply',
    opacity: 0.55,
    position: 'absolute',
    width: '100%',
  },
});

const Overlay = styled('div', {
  background:
    'linear-gradient(to top, rgba(42, 37, 32, 0.82), rgba(42, 37, 32, 0.35) 55%, rgba(42, 37, 32, 0))',
  bottom: 0,
  color: '#fff',
  left: 0,
  padding: '2rem 0.8rem 0.65rem',
  position: 'absolute',
  right: 0,
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  '& h3': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.2rem',
    fontVariationSettings: '"SOFT" 60',
    fontWeight: 600,
    lineHeight: 1.15,
    margin: 0,
  },
  '& p': {
    fontSize: '0.8rem',
    margin: '0.15rem 0 0',
    opacity: 0.92,
  },
});

const OnPicture = styled('div', {
  position: 'absolute',
  right: '0.6rem',
  top: '0.6rem',
});

const Body = styled('div', {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: '0.4rem',
  padding: '0.65rem 0.8rem 0.8rem',
});

const Excerpt = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  display: '-webkit-box',
  fontSize: '0.8rem',
  lineHeight: 1.4,
  margin: 0,
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
});

// A few lines from the menu on one line: "Lantbröd 65 kr · Rågbröd 70 kr".
const Taste = styled('p', {
  fontSize: '0.78rem',
  lineHeight: 1.45,
  margin: 0,
  '& .title': {
    color: 'var(--kind)',
    fontWeight: 700,
    marginRight: '0.4rem',
  },
  // An item keeps its price on its own line.
  '& .item': { whiteSpace: 'nowrap' },
  '& .price': { color: 'var(--cocoso-mylla-soft)' },
  '& .sep': { color: 'var(--cocoso-mylla-soft)', margin: '0 0.35rem' },
});

const Facts = styled('div', {
  borderTop: '1px solid rgba(60, 40, 20, 0.1)',
  color: 'var(--cocoso-mylla-soft)',
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: '0.74rem',
  gap: '0.2rem 0.75rem',
  marginTop: 'auto',
  paddingTop: '0.5rem',
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
  fontSize: '0.78rem',
  '&:empty': { display: 'none' },
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
  const kind = business.kinds?.[0];
  const image = business.images?.[0];
  const place = locations.find((l: any) => l._id === business.locationId);
  const prefix = place ? `/${place.slug}` : '';
  const excerpt = firstParagraph(business.description);
  const taste = tasteOf(business.menu);
  const address = formatAddress(business.address);
  const phone = business.contact?.phone;

  return (
    <Card style={kindVars(kind)} to={`${prefix}/businesses/${business._id}`}>
      <Picture>
        {image ? (
          <img
            alt=""
            loading="lazy"
            src={getImageUrl(image, 'small') || image}
          />
        ) : (
          <PlaceholderImage className="shapes" seed={business._id} />
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
        <Overlay>
          <h3>{business.label}</h3>
          {business.tagline && <p>{business.tagline}</p>}
        </Overlay>
      </Picture>
      <Body>
        <StatusLine>
          <OpenStatus business={business} />
        </StatusLine>
        {excerpt && <Excerpt>{excerpt}</Excerpt>}
        {taste.length > 0 && (
          <Taste>
            <span className="title">
              {t(`businesses.menu.${kind || 'eat'}`)}
            </span>
            {taste.map((item: any, i: number) => (
              <React.Fragment key={`${item.name}-${i}`}>
                {i > 0 && <span className="sep">·</span>}
                <span className="item">
                  {item.name}
                  {item.price && <span className="price"> {item.price}</span>}
                </span>
              </React.Fragment>
            ))}
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
            all={{ name: t('locations.switcher.whole'), to: '/businesses' }}
            compact
            currentId={current?._id ?? null}
            emptyIds={locations
              .filter((l: any) => inPlace(l._id).length === 0)
              .map((l: any) => l._id)}
            locations={locations}
            section="businesses"
          />
        </Picker>

        {sections.map(({ kind, items }) => (
          <Section key={kind} style={kindVars(kind)}>
            <SectionHead>
              {t(`businesses.kinds.${kind}`)}
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

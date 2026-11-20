import React from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';
import UtensilsIcon from 'lucide-react/dist/esm/icons/utensils';
import BedIcon from 'lucide-react/dist/esm/icons/bed-double';
import HandHeartIcon from 'lucide-react/dist/esm/icons/hand-heart';
import CheckIcon from 'lucide-react/dist/esm/icons/check';
import ShoppingBagIcon from 'lucide-react/dist/esm/icons/shopping-bag';

import { styled } from '/stitches.config';
import { locationsAtom, siteAtom } from '/imports/state';
import { formatAddress } from '/imports/api/_utils/address';
import { websiteLabel } from '/imports/api/_utils/contact';
import PlaceTag from '/imports/ui/generic/PlaceTag';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';
import { sitePath } from '/imports/api/_utils/paths';
import { worldForLocation } from '/imports/ui/utils/locationPalette';
import {
  OFFERING_KINDS,
  type OfferingKind,
} from '/imports/api/offerings/offeringKinds';
import { Status } from '/imports/ui/entry/PlaceOfferings';
import {
  formatDay,
  formatTime,
  isoDay,
  openState,
  useNow,
} from '/imports/ui/pages/businesses/hours';

import PageHeading from './PageHeading';
import {
  KindCount,
  KindHead,
  KindIcon,
  KindName,
  KindText,
  KindTile,
  Kinds,
} from './KindTiles';

// Äta, handla och bo: the places that offer something — food, a bed,
// services, things for sale. The page opens with the kinds of offering as
// tiles to tick, one or more (?kind=eat,shop; none shows all); below
// them the places come under what they offer, in the order of the kinds, a place
// offering several under each. Which part of the municipality is shown
// follows the address (/uddebo/businesses), as on the other listings. The
// cards speak the same picture language as the place cards — a photo with
// the name over a dark fade — and say enough to decide without opening
// them: whether it is open and a few lines about what it offers. Each
// opens the place's own page.

type Kind = OfferingKind;

// Each kind's colour, from the letters of the logo, and the light end of
// the gradient behind a card without a photo.
const KIND_LOOK: Record<Kind, { ink: string; light: string }> = {
  eat: { ink: '#c4512f', light: '#f3cdb8' },
  stay: { ink: '#7a4f9a', light: '#dccbe8' },
  service: { ink: '#4f7a3a', light: '#d3e3c4' },
  shop: { ink: '#2f6fa3', light: '#c4dbee' },
};

const KIND_ICON: Record<Kind, typeof UtensilsIcon> = {
  eat: UtensilsIcon,
  stay: BedIcon,
  service: HandHeartIcon,
  shop: ShoppingBagIcon,
};

const lookOf = (kind?: string) => KIND_LOOK[kind as Kind] || KIND_LOOK.eat;

const kindVars = (kind?: string) =>
  ({
    '--kind': lookOf(kind).ink,
    '--kind-light': lookOf(kind).light,
  } as React.CSSProperties);

const Page = styled('div', {
  boxSizing: 'border-box',
  margin: '0 auto',
  maxWidth: 'calc(var(--cocoso-page, 1180px) + 2 * var(--cocoso-gutter, 1rem))',
  padding: '0 var(--cocoso-gutter, 1rem) 3rem',
  width: '100%',
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

// "Öppet nu · till 16" on the photo, the first thing the eye finds.
const OpenBadge = styled('span', {
  alignItems: 'center',
  backgroundColor: '#2b7d38',
  borderRadius: '999px',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
  color: '#fff',
  display: 'inline-flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.75rem',
  fontWeight: 700,
  gap: '0.4rem',
  left: '0.6rem',
  padding: '0.3rem 0.65rem 0.3rem 0.55rem',
  position: 'absolute',
  top: '0.6rem',
  zIndex: 1,
  '&::before': {
    animation: 'cocoso-open-pulse 2s ease-out infinite',
    backgroundColor: '#b8f0c0',
    borderRadius: '50%',
    content: '""',
    height: '0.5rem',
    width: '0.5rem',
  },
  '@keyframes cocoso-open-pulse': {
    '0%': { boxShadow: '0 0 0 0 rgba(184, 240, 192, 0.8)' },
    '70%': { boxShadow: '0 0 0 6px rgba(184, 240, 192, 0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(184, 240, 192, 0)' },
  },
  '@media (prefers-reduced-motion: reduce)': {
    '&::before': { animation: 'none' },
  },
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

const StatusLine = styled('div', {
  fontSize: '0.78rem',
  '&:empty': { display: 'none' },
});

// An offering's own hours and note, or else its place's
const hoursOf = (offering: any, place: any) =>
  Array.isArray(offering?.openingHours)
    ? { hours: offering.openingHours, note: offering.hoursNote }
    : {
        hours: place.commerce?.openingHours || [],
        note: place.commerce?.hoursNote,
      };

// Whether it is open by these hours, worked out only in the browser (see
// useNow); null on the server and without opening hours.
function useOpenState(hours: any[]) {
  const now = useNow();
  if (!now || !hours?.length) {
    return null;
  }
  return {
    state: openState(hours, now),
    today: formatDay(hours, isoDay(now)),
  };
}

// Under the photo: today's hours when open (the badge says the rest), or
// that it is closed.
function OpenStatus({ open }: { open: ReturnType<typeof useOpenState> }) {
  const { t } = useTranslation('common');
  if (!open) {
    return null;
  }
  const { state, today } = open;
  if (state.open) {
    return today ? (
      <Status open>{t('businesses.todayHours', { hours: today })}</Status>
    ) : null;
  }
  return (
    <Status open={false}>
      {today
        ? `${t('businesses.closedNow')} · ${t('businesses.todayHours', {
            hours: today,
          })}`
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

// What an offering says of itself, unless it starts with a heading (a
// menu or a list of rooms): then what the place says.
const excerptOf = (offering: any, place: any) => {
  const html = offering?.description || '';
  const heading = /^\s*<p[^>]*>\s*<(strong|b|h\d)>[^<]*<\/\1>\s*<\/p>/i.test(
    html
  );
  return (
    (!heading && firstParagraph(html)) || firstParagraph(place.description)
  );
};

// A place under one of the kinds it offers, with that offering's words,
// phone and hours, the place's own when the offering has none.
function PlaceCard({
  place: business,
  kind,
  showPlace,
}: {
  place: any;
  // A kind it offers, or "other" for a place offering nothing yet
  kind: string;
  // The place's tag on the picture, when the page is not already one place
  showPlace: boolean;
}) {
  const { t } = useTranslation('common');
  const locations = useAtomValue(locationsAtom);
  const offering = business.offerings?.find((o: any) => o.kind === kind);
  const image = business.images?.[0];
  const place = locations.find((l: any) => l._id === business.locationId);

  const excerpt = excerptOf(offering, business);
  const address = formatAddress(business.address);
  const phone =
    offering?.contact?.phone ||
    business.commerce?.contact?.phone ||
    business.contact?.phone;
  const website = offering?.website || business.commerce?.website;
  const { hours, note } = hoursOf(offering, business);
  const open = useOpenState(hours);

  return (
    <Card style={kindVars(kind)} to={sitePath('resources', business._id)}>
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
        {open?.state.open && (
          <OpenBadge>
            {t('businesses.openNow')} ·{' '}
            {t('businesses.until', { time: formatTime(open.state.closes) })}
          </OpenBadge>
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
          {business.commerce?.tagline && <p>{business.commerce.tagline}</p>}
        </Overlay>
      </Picture>
      <Body>
        <StatusLine>
          <OpenStatus open={open} />
        </StatusLine>
        {excerpt && <Excerpt>{excerpt}</Excerpt>}
        {(address || phone || website || note) && (
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
            {website && (
              <span>
                <GlobeIcon width={13} height={13} />
                {websiteLabel(website).replace(/^www\./, '')}
              </span>
            )}
            {note && <span>{note}</span>}
          </Facts>
        )}
      </Body>
    </Card>
  );
}

export interface OfferingsHybridProps {
  siteDoc: any;
  places: any[];
}

export default function OfferingsHybrid({
  siteDoc,
  places,
}: OfferingsHybridProps) {
  const { t } = useTranslation('common');
  const site = useAtomValue(siteAtom);
  const current = useCurrentLocation();

  const all = places || [];
  const inPlace = (id: string) => all.filter((b) => b.locationId === id);

  // The places in the part of the municipality shown; below the tiles
  // they come in the order of the kinds. A place offering several, like a
  // manor with a restaurant and rooms, is under each.
  const shown = current ? inPlace(current._id) : all;

  // The kinds ticked among the tiles (?kind=eat,shop); none ticked shows
  // them all. A tile ticks and unticks its kind.
  const [searchParams, setSearchParams] = useSearchParams();
  const wanted = (searchParams.get('kind') || '').split(',');
  const selected = OFFERING_KINDS.filter((kind) => wanted.includes(kind));
  const isOn = (kind: string) => selected.includes(kind as Kind);
  const toggle = (kind: Kind) =>
    setSearchParams(
      (params) => {
        const next = isOn(kind)
          ? selected.filter((k) => k !== kind)
          : OFFERING_KINDS.filter((k) => k === kind || isOn(k));
        if (next.length) {
          params.set('kind', next.join(','));
        } else {
          params.delete('kind');
        }
        return params;
      },
      { preventScrollReset: true, replace: true }
    );
  const countOf = (kind: Kind) =>
    shown.filter((b) => b.offerings?.some((o: any) => o.kind === kind)).length;

  // Within a kind, what is open now comes first, then what opens later
  // today, then places without opening hours (an inn is booked, not
  // visited), and last what is closed all day. The sort is stable, so the
  // order by name holds within each step. It needs the clock, so the
  // server renders by name and the browser reorders once mounted.
  const now = useNow();
  const rank = (offering: any, place: any) => {
    const { hours } = hoursOf(offering, place);
    if (!now) {
      return 0;
    }
    if (!hours.length) {
      return 2;
    }
    const state = openState(hours, now);
    if (state.open) {
      return 0;
    }
    return state.next?.day === isoDay(now) ? 1 : 3;
  };

  const sections = OFFERING_KINDS.map(
    (kind): { kind: string; items: any[] } => ({
      kind,
      items: shown
        .map((b) => ({ b, o: b.offerings?.find((o: any) => o.kind === kind) }))
        .filter(({ o }) => o)
        .map(({ b, o }) => ({ b, r: rank(o, b) }))
        .sort((x, y) => x.r - y.r)
        .map(({ b }) => b),
    })
  )
    // A commercial place offering nothing yet, last
    .concat({
      kind: 'other',
      items: shown.filter((b) => !b.offerings?.length),
    })
    .filter(({ items }) => items.length > 0)
    .filter(({ kind }) => !selected.length || isOn(kind));

  return (
    <>
      {/* The feature is "Äta, handla & bo"; the page says it in words */}
      <PageHeading
        listing="businesses"
        site={site || siteDoc}
        title={t('offerings.pageTitle')}
      />

      <Page>
        <Kinds compact role="group" aria-label={t('offerings.chooseKind')}>
          {OFFERING_KINDS.map((kind) => {
            const Icon = KIND_ICON[kind];
            return (
              <KindTile
                key={kind}
                aria-pressed={isOn(kind)}
                compact
                css={{ background: lookOf(kind).light }}
                dimmed={selected.length > 0 && !isOn(kind)}
                selected={isOn(kind)}
                type="button"
                onClick={() => toggle(kind)}
              >
                <KindHead>
                  {/* Ticked: a tick in place of its icon */}
                  <KindIcon compact css={{ background: lookOf(kind).ink }}>
                    {isOn(kind) ? <CheckIcon /> : <Icon />}
                  </KindIcon>
                  <KindCount>{countOf(kind)}</KindCount>
                </KindHead>
                <KindName compact>{t(`offerings.kinds.${kind}`)}</KindName>
                <KindText compact>{t(`offerings.kindTexts.${kind}`)}</KindText>
              </KindTile>
            );
          })}
        </Kinds>

        {sections.map(({ kind, items }) => (
          <Section key={kind} style={kindVars(kind)}>
            <SectionHead>
              {kind === 'other'
                ? t('offerings.other')
                : t(`offerings.kinds.${kind}`)}
              <span className="count">
                {t('businesses.count', { count: items.length })}
              </span>
            </SectionHead>
            <Cards>
              {items.map((business) => (
                <PlaceCard
                  key={business._id}
                  kind={kind}
                  place={business}
                  showPlace={!current}
                />
              ))}
            </Cards>
          </Section>
        ))}

        {selected.length > 0 && sections.length === 0 && shown.length > 0 && (
          <Notice>
            {t('offerings.noneOfKind', {
              kind: selected
                .map((kind) => t(`offerings.kinds.${kind}`).toLowerCase())
                .join(t('offerings.or')),
            })}
          </Notice>
        )}

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

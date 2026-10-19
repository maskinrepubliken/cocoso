import React from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { styled } from '/stitches.config';
import { locationsAtom, siteAtom } from '/imports/state';
import PlaceTag from '/imports/ui/generic/PlaceTag';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import Tag from '/imports/ui/generic/Tag';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import { worldForLocation } from '/imports/ui/utils/locationPalette';
import {
  formatDay,
  formatTime,
  isoDay,
  openState,
  useNow,
} from '/imports/ui/pages/businesses/hours';

import PageHeading from './PageHeading';

// Äta/handla/bo: cafés, restaurants, shops and inns as picture cards like
// the places, each saying whether it is open now. The kinds above filter.

const KINDS = ['eat', 'shop', 'stay'] as const;

const Page = styled('div', {
  boxSizing: 'border-box',
  margin: '0 auto',
  maxWidth: 'calc(var(--cocoso-page, 1180px) + 2 * var(--cocoso-gutter, 1rem))',
  padding: '0 var(--cocoso-gutter, 1rem) 3rem',
  width: '100%',
});

const Filters = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  justifyContent: 'center',
  marginBottom: '0.75rem',
});

const Notice = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.85rem',
  fontStyle: 'italic',
  margin: '0 auto 1.25rem',
  maxWidth: '60ch',
  textAlign: 'center',
});

const Cards = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
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
  transition: 'transform 0.15s ease',
  '&:hover': { transform: 'translateY(-2px)' },
  '&:hover h3': { textDecoration: 'underline' },
});

const Picture = styled('div', {
  aspectRatio: '4 / 3',
  overflow: 'hidden',
  position: 'relative',
  '& > img, & > svg': {
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    width: '100%',
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
  gap: '0.35rem',
  padding: '0.85rem 1rem 1rem',
  '& h3': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.25rem',
    fontVariationSettings: '"SOFT" 60',
    fontWeight: 600,
    lineHeight: 1.2,
    margin: 0,
  },
});

const Tagline = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.92rem',
  margin: 0,
});

const Foot = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: '0.82rem',
  gap: '0.4rem 0.75rem',
  marginTop: 'auto',
  paddingTop: '0.4rem',
});

const Kind = styled('span', {
  border: '1px solid var(--cocoso-colors-theme-700)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  fontWeight: 700,
  padding: '0.05rem 0.55rem',
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

function OpenStatus({ business }: { business: any }) {
  const { t } = useTranslation('common');
  const now = useNow();
  if (!now || !business.openingHours?.length) {
    return null;
  }
  const state = openState(business.openingHours, now);
  if (state.open) {
    return (
      <Status open>
        {t('businesses.openNow')} ·{' '}
        {t('businesses.closesAt', { time: formatTime(state.closes) })}
      </Status>
    );
  }
  const today = formatDay(business.openingHours, isoDay(now));
  return (
    <Status open={false}>
      {today
        ? `${t('businesses.closedNow')} · ${t('businesses.todayHours', { hours: today })}`
        : t('businesses.closedToday')}
    </Status>
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
  const prefix = useLocationPrefix();
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = searchParams.get('kind');

  const choose = (next: string | null) =>
    setSearchParams(
      (params) => {
        if (next) {
          params.set('kind', next);
        } else {
          params.delete('kind');
        }
        return params;
      },
      { preventScrollReset: true, replace: true }
    );

  const all = businesses || [];
  const shown = kind ? all.filter((b) => b.kinds?.includes(kind)) : all;
  const hasExamples = all.some((b) => b.isExample);

  return (
    <>
      <PageHeading site={site || siteDoc} listing="businesses" />

      <Page>
        <Filters>
          <Tag
            checkable
            checked={!kind}
            label={t('businesses.all')}
            onClick={() => choose(null)}
          />
          {KINDS.map((k) => (
            <Tag
              key={k}
              checkable
              checked={kind === k}
              label={t(`businesses.kinds.${k}`)}
              onClick={() => choose(kind === k ? null : k)}
            />
          ))}
        </Filters>

        {hasExamples && <Notice>{t('businesses.example')}</Notice>}

        {shown.length === 0 && <Notice>{t('businesses.empty')}</Notice>}

        <Cards>
          {shown.map((business) => {
            const image = business.images?.[0];
            const place = locations.find(
              (l: any) => l._id === business.locationId
            );
            return (
              <Card
                key={business._id}
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
                  {place && (
                    <OnPicture>
                      <PlaceTag
                        name={place.name}
                        onImage
                        world={worldForLocation(locations, place._id)}
                      />
                    </OnPicture>
                  )}
                </Picture>
                <Body>
                  <h3>{business.label}</h3>
                  {business.tagline && <Tagline>{business.tagline}</Tagline>}
                  <Foot>
                    {business.kinds?.map((k: string) => (
                      <Kind key={k}>{t(`businesses.kinds.${k}`)}</Kind>
                    ))}
                    <OpenStatus business={business} />
                  </Foot>
                </Body>
              </Card>
            );
          })}
        </Cards>
      </Page>
    </>
  );
}

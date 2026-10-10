import React from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';

import { styled } from '/stitches.config';
import { siteAtom } from '/imports/state';
import {
  useLocationPrefix,
  useLocationTag,
} from '/imports/ui/utils/useLocation';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import {
  findRequestKind,
  REQUEST_KINDS,
  RequestKind,
} from '/imports/ui/pages/works/requestKinds';

import PageHeading from './PageHeading';
import { entryPathWithin } from './useOpenEntry';

// The works listing, shown as förfrågningar: neighbours sharing rides,
// lending, giving away and tipping each other off. The kinds at the top are
// the filter; the requests below are cards with their kind, text and who
// asks.

const ink = '#151515';
const green = 'var(--cocoso-colors-theme-800)';

const Page = styled('div', {
  margin: '0 auto',
  maxWidth: '1180px',
  padding: '0 1rem 3rem',
  width: '100%',
});

// On a phone the kinds are one row you swipe, with the next one peeking in
// from the edge, so the list of requests starts within the first screen.
const Kinds = styled('div', {
  display: 'grid',
  gap: '0.6rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  marginBottom: '1.5rem',
  '@media (max-width: 600px)': {
    display: 'flex',
    gap: '0.5rem',
    margin: '0 -16px 1.25rem',
    overflowX: 'auto',
    padding: '4px 16px 8px',
    scrollbarWidth: 'none',
    scrollPadding: '0 16px',
    scrollSnapType: 'x proximity',
    '&::-webkit-scrollbar': { display: 'none' },
  },
});

const KindTile = styled('button', {
  all: 'unset',
  border: '2px solid transparent',
  borderRadius: '16px',
  boxShadow: '0 8px 20px -16px rgba(60, 35, 10, 0.5)',
  boxSizing: 'border-box',
  color: ink,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  padding: '0.8rem 0.9rem',
  transition: 'transform 0.15s ease, border-color 0.15s ease',
  '&:hover': { transform: 'translateY(-2px)' },
  '&:focus-visible': { outline: `2px solid ${green}`, outlineOffset: '2px' },
  variants: {
    selected: { true: { borderColor: green } },
    dimmed: { true: { opacity: 0.55 } },
  },
  '@media (max-width: 600px)': {
    flex: '0 0 auto',
    gap: '0.4rem',
    padding: '0.6rem 0.75rem',
    scrollSnapAlign: 'start',
    width: '128px',
  },
});

const KindHead = styled('span', {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
});

const KindIcon = styled('span', {
  alignItems: 'center',
  background: green,
  borderRadius: '999px',
  color: 'white',
  display: 'inline-flex',
  height: '2.1rem',
  justifyContent: 'center',
  width: '2.1rem',
  '& svg': { height: '1.15rem', width: '1.15rem' },
  '@media (max-width: 600px)': {
    height: '1.8rem',
    width: '1.8rem',
    '& svg': { height: '1rem', width: '1rem' },
  },
});

const KindCount = styled('span', {
  background: 'rgba(255, 255, 255, 0.6)',
  borderRadius: '999px',
  fontSize: '0.8rem',
  fontWeight: 700,
  padding: '0.1rem 0.5rem',
});

const KindName = styled('span', {
  fontSize: '1.02rem',
  fontWeight: 700,
  '@media (max-width: 600px)': { fontSize: '0.92rem', whiteSpace: 'nowrap' },
});

const KindText = styled('span', {
  fontSize: '0.82rem',
  lineHeight: 1.35,
  opacity: 0.85,
  '@media (max-width: 600px)': { display: 'none' },
});

const ListHead = styled('div', {
  alignItems: 'baseline',
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'space-between',
  marginBottom: '0.6rem',
  '& h2': { fontSize: '1.15rem', margin: 0 },
});

const ShowAll = styled('button', {
  all: 'unset',
  color: green,
  cursor: 'pointer',
  fontWeight: 600,
  textDecoration: 'underline',
});

const Cards = styled('div', {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
});

const Card = styled(Link, {
  background: 'var(--cocoso-papper)',
  borderRadius: 'var(--cocoso-radius-kort)',
  boxShadow: 'var(--cocoso-skugga-kort)',
  color: ink,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
  padding: '0.9rem 1rem',
  textDecoration: 'none',
  transition: 'transform 0.15s ease',
  '&:hover': { transform: 'translateY(-2px)' },
});

const CardTop = styled('div', {
  alignItems: 'center',
  display: 'flex',
  fontSize: '0.8rem',
  gap: '0.5rem',
  justifyContent: 'space-between',
});

const Badge = styled('span', {
  alignItems: 'center',
  borderRadius: '999px',
  display: 'inline-flex',
  fontWeight: 700,
  gap: '0.3rem',
  padding: '0.2rem 0.6rem 0.2rem 0.45rem',
  '& svg': { color: green, height: '0.95rem', width: '0.95rem' },
});

const CardBody = styled('div', {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'space-between',
});

const CardTitle = styled('h3', {
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontSize: '1.2rem',
  fontWeight: 600,
  lineHeight: 1.2,
  margin: '0 0 0.25rem',
});

const CardText = styled('p', {
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
  color: 'var(--cocoso-colors-gray-700)',
  display: '-webkit-box',
  fontSize: '0.9rem',
  lineHeight: 1.4,
  margin: 0,
  overflow: 'hidden',
});

const Thumb = styled('img', {
  borderRadius: '12px',
  flexShrink: 0,
  height: '72px',
  objectFit: 'cover',
  width: '72px',
});

const CardFoot = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: '0.82rem',
  gap: '0.5rem',
  marginTop: 'auto',
  paddingTop: '0.25rem',
});

const Avatar = styled('span', {
  alignItems: 'center',
  background: 'var(--cocoso-colors-theme-100)',
  borderRadius: '999px',
  color: green,
  display: 'inline-flex',
  fontWeight: 700,
  height: '1.6rem',
  justifyContent: 'center',
  overflow: 'hidden',
  width: '1.6rem',
  '& img': { height: '100%', objectFit: 'cover', width: '100%' },
});

const Place = styled('span', {
  alignItems: 'center',
  color: green,
  display: 'inline-flex',
  gap: '0.2rem',
  marginLeft: 'auto',
  '& svg': { height: '0.85rem', width: '0.85rem' },
});

const Empty = styled('div', {
  border: '2px dashed rgba(40, 30, 15, 0.2)',
  borderRadius: '16px',
  padding: '2rem 1rem',
  textAlign: 'center',
});

function RequestCard({ work, kind }: { work: any; kind?: RequestKind }) {
  const { t } = useTranslation('common');
  const prefix = useLocationPrefix();
  const place = useLocationTag(work);
  const Icon = kind?.icon;
  const image = work.images?.[0];
  const author = work.showAvatar !== false ? work.authorUsername : null;

  return (
    <Card to={entryPathWithin(prefix, work, 'works')}>
      <CardTop>
        <Badge css={{ background: kind?.color || '#e9dcc4' }}>
          {Icon && <Icon />}
          {kind ? t(`requests.kinds.${kind.key}.name`) : work.category?.label}
        </Badge>
        <span>{dayjs(work.creationDate).format('D MMM')}</span>
      </CardTop>
      <CardBody>
        <div>
          <CardTitle>{work.title}</CardTitle>
          {work.shortDescription && (
            <CardText>{work.shortDescription}</CardText>
          )}
        </div>
        {image && (
          <Thumb
            alt=""
            loading="lazy"
            src={getImageUrl(image, 'small') || image}
          />
        )}
      </CardBody>
      <CardFoot>
        {author && (
          <>
            <Avatar>
              {work.authorAvatar ? (
                <img alt="" src={work.authorAvatar} />
              ) : (
                author[0]?.toUpperCase()
              )}
            </Avatar>
            <span>{author}</span>
          </>
        )}
        {place && (
          <Place>
            <MapPin />
            {place}
          </Place>
        )}
      </CardFoot>
    </Card>
  );
}

export interface WorksHybridProps {
  siteDoc: any;
  works: any[];
  documents?: any[];
}

export default function WorksHybrid({ siteDoc, works }: WorksHybridProps) {
  const { t } = useTranslation('common');
  const site = useAtomValue(siteAtom);
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = findRequestKind(searchParams.get('category') || undefined);

  const choose = (kind?: RequestKind) => {
    setSearchParams(
      (params) => {
        if (!kind || kind === selected) {
          params.delete('category');
        } else {
          params.set('category', kind.label);
        }
        return params;
      },
      { preventScrollReset: true, replace: true }
    );
  };

  const all = works || [];
  const countOf = (kind: RequestKind) =>
    all.filter((work) => findRequestKind(work.category?.label) === kind)
      .length;
  const shown = selected
    ? all.filter((work) => findRequestKind(work.category?.label) === selected)
    : all;

  return (
    <>
      <PageHeading site={site || siteDoc} listing="works" />

      <Page>
        <Kinds>
          {REQUEST_KINDS.map((kind) => {
            const Icon = kind.icon;
            return (
              <KindTile
                key={kind.key}
                aria-pressed={kind === selected}
                css={{ background: kind.color }}
                dimmed={Boolean(selected) && kind !== selected}
                selected={kind === selected}
                type="button"
                onClick={() => choose(kind)}
              >
                <KindHead>
                  <KindIcon>
                    <Icon />
                  </KindIcon>
                  <KindCount>{countOf(kind)}</KindCount>
                </KindHead>
                <KindName>{t(`requests.kinds.${kind.key}.name`)}</KindName>
                <KindText>
                  {t(`requests.kinds.${kind.key}.description`)}
                </KindText>
              </KindTile>
            );
          })}
        </Kinds>

        <ListHead>
          <h2>
            {selected
              ? t(`requests.kinds.${selected.key}.name`)
              : t('requests.count', { count: shown.length })}
          </h2>
          {selected && (
            <ShowAll type="button" onClick={() => choose()}>
              {t('requests.all')}
            </ShowAll>
          )}
        </ListHead>

        {shown.length > 0 ? (
          <Cards>
            {shown.map((work) => (
              <RequestCard
                key={work._id}
                kind={findRequestKind(work.category?.label)}
                work={work}
              />
            ))}
          </Cards>
        ) : (
          <Empty>
            <strong>{t('requests.empty')}</strong>
            <div>{t('requests.emptyHint')}</div>
          </Empty>
        )}
      </Page>
    </>
  );
}

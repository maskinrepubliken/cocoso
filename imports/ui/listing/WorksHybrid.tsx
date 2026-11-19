import React from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';

import { styled } from '/stitches.config';
import { locationsAtom, siteAtom } from '/imports/state';
import PlaceTag from '/imports/ui/generic/PlaceTag';
import { worldForLocation } from '/imports/ui/utils/locationPalette';
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
import {
  KindCount,
  KindHead,
  KindIcon,
  KindName,
  KindText,
  KindTile,
  Kinds,
} from './KindTiles';
import { entryPathWithin } from './useOpenEntry';

// The works listing, shown as förfrågningar: neighbours sharing rides,
// lending, borrowing, giving away and helping each other. The kinds at the top are
// the filter; the requests below are cards with their kind, text and who
// asks.

const ink = '#151515';
const green = 'var(--cocoso-colors-theme-800)';

const Page = styled('div', {
  boxSizing: 'border-box',
  margin: '0 auto',
  maxWidth: 'calc(var(--cocoso-page) + 2 * var(--cocoso-gutter))',
  padding: '0 var(--cocoso-gutter) 3rem',
  width: '100%',
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

// When it was posted: the date, and how long ago in words
const When = styled('span', {
  color: 'var(--cocoso-mylla-soft)',
  marginLeft: 'auto',
  textAlign: 'right',
  '& b': { color: ink, fontWeight: 600 },
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
  const locations = useAtomValue(locationsAtom);
  const world = worldForLocation(locations, work.locationId);
  const Icon = kind?.icon;
  const image = work.images?.[0];
  // Older requests have a short description; the rest show their own
  const text =
    work.shortDescription ||
    (work.longDescription || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const author =
    work.showAvatar !== false ? work.authorName || work.authorUsername : null;
  const posted = dayjs(work.creationDate);

  return (
    <Card to={entryPathWithin(prefix, work, 'works')}>
      <CardTop>
        <Badge css={{ background: kind?.color || '#e9dcc4' }}>
          {Icon && <Icon />}
          {kind ? t(`requests.kinds.${kind.key}.name`) : work.category?.label}
        </Badge>
        {place && <PlaceTag name={place} world={world} className="bare" />}
      </CardTop>
      <CardBody>
        <div>
          <CardTitle>{work.title}</CardTitle>
          {text && <CardText>{text}</CardText>}
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
        <When>
          <b>{posted.format('D MMM')}</b> · {posted.fromNow()}
        </When>
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
    all.filter((work) => findRequestKind(work.category?.label) === kind).length;
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

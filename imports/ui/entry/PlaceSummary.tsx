import React from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import ArrowRightIcon from 'lucide-react/dist/esm/icons/arrow-right';

import { styled } from '/stitches.config';
import AddressBlock from '/imports/ui/generic/AddressBlock';
import BookableChip from '/imports/ui/generic/BookableChip';
import LocationTag from '/imports/ui/generic/LocationTag';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import ThreeDIcon, { sectionIcons } from '/imports/ui/generic/ThreeDIcon';
import BookingInfo, {
  type BookingWithPerson,
} from '/imports/ui/pages/resources/components/BookingInfo';
import { hasAddress, type Address } from '/imports/api/_utils/address';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

import { Chips, EntryColumn, Panel, RichText, SectionHead } from './EntryHero';

export interface SummaryPlace {
  _id: string;
  label: string;
  description?: string;
  images?: string[];
  address?: Partial<Address> | null;
  locationId?: string | null;
  isBookable?: boolean;
  booking?: BookingWithPerson | null;
  parts?: { _id: string; label: string; isUnlisted?: boolean }[];
}

const WIDE = '@media (min-width: 760px)';

const Layout = styled('div', {
  display: 'grid',
  gap: '1.25rem',
  gridTemplateColumns: 'minmax(0, 1fr)',
  [WIDE]: {
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
  },
});

const Picture = styled('div', {
  aspectRatio: '16 / 10',
  borderRadius: '12px',
  marginBottom: '1rem',
  overflow: 'hidden',
  '& > *': {
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
});

const Small = styled('h3', {
  color: 'var(--cocoso-tegel)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  margin: '1.25rem 0 0.5rem',
  textTransform: 'uppercase',
});

const PartNames = styled('p', {
  margin: 0,
});

const ToPage = styled(Link, {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-colors-theme-700)',
  borderRadius: '999px',
  color: 'white',
  display: 'inline-flex',
  fontWeight: 700,
  gap: '0.4rem',
  marginTop: '1.25rem',
  padding: '0.55rem 1.1rem',
  textDecoration: 'none',
  '& svg': { height: '1rem', width: '1rem' },
  '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-800)' },
});

// A place on another page, an organizer's: much of what its own page says
// (picture, what it is, where, how to book it, the places in it) and a
// link to it.
export default function PlaceSummary({ place }: { place: SummaryPlace }) {
  const [tc] = useTranslation('common');
  const prefix = useLocationPrefix();
  const path = `${prefix}/resources/${place._id}`;
  const picture = getImageUrl(place.images?.[0], 'medium');
  const parts = place.parts || [];

  return (
    <EntryColumn>
      <SectionHead>
        <h2 className="entry-section-title">
          <ThreeDIcon name={sectionIcons.resources} size={40} />
          <Link style={{ color: 'inherit', textDecoration: 'none' }} to={path}>
            {place.label}
          </Link>
        </h2>
      </SectionHead>
      <Panel>
        <Layout>
          <div>
            <Picture>
              {picture ? (
                <img alt={place.label} src={picture} />
              ) : (
                <PlaceholderImage seed={place._id} />
              )}
            </Picture>
            <Chips>
              <LocationTag locationId={place.locationId || undefined} />
              <BookableChip place={place} />
            </Chips>
            {place.description && (
              <RichText className="text-content" css={{ marginTop: '0.75rem' }}>
                {HTMLReactParser(DOMPurify.sanitize(place.description))}
              </RichText>
            )}
            {parts.length > 0 && (
              <>
                <Small>{tc('entry.parts')}</Small>
                <PartNames>
                  {parts.map((part) => part.label).join(', ')}
                </PartNames>
              </>
            )}
          </div>
          <div>
            {hasAddress(place.address) && (
              <AddressBlock
                address={place.address}
                label={place.label}
                mapHeight={180}
              />
            )}
            {place.booking && (
              <>
                <Small>{tc('entry.booking')}</Small>
                <BookingInfo booking={place.booking} label={place.label} />
              </>
            )}
          </div>
        </Layout>
        <ToPage to={path}>
          {tc('entry.toPlacePage')}
          <ArrowRightIcon aria-hidden />
        </ToPage>
      </Panel>
    </EntryColumn>
  );
}

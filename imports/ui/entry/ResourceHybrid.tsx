import { Link } from 'react-router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import UsersIcon from 'lucide-react/dist/esm/icons/users';
import CalendarCheckIcon from 'lucide-react/dist/esm/icons/calendar-check';
import LayersIcon from 'lucide-react/dist/esm/icons/layers';
import { LightboxProvider } from '/imports/ui/generic/Lightbox';

import { styled } from '/stitches.config';
import DocumentsField from '/imports/ui/pages/resources/components/DocumentsField';
import BookingInfo, {
  type BookingWithPerson,
} from '/imports/ui/pages/resources/components/BookingInfo';
import type { Document, Site, ResourceForCombo } from '/imports/ui/types';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

import AddressBlock from '/imports/ui/generic/AddressBlock';
import { hasAddress, type Address } from '/imports/api/_utils/address';
import { hasContact, type Contact } from '/imports/api/_utils/contact';
import { isFeatureEnabled } from '/imports/api/_utils/features';

import LocationTag from '/imports/ui/generic/LocationTag';

import EntryHero, {
  Chip,
  EntryColumn,
  EntryMeta,
  EntryPage,
  EntryTopBar,
  FilledPicture,
  MorePictures,
  Panel,
  SectionHead,
  plainText,
} from './EntryHero';

interface Resource {
  _id: string;
  label?: string;
  address?: Partial<Address> | null;
  contact?: Contact | null;
  description?: string;
  imageUrl?: string;
  images?: string[];
  capacity?: number;
  isBookable?: boolean;
  booking?: BookingWithPerson | null;
  isCombo?: boolean;
  locationId?: string;
  resourcesForCombo?: ResourceForCombo[];
}

export interface ResourceHybridProps {
  documents?: Document[];
  resource: Resource;
  siteDoc: Site;
}

const Parts = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  '& a': {
    border: '1.5px solid var(--cocoso-colors-theme-800)',
    borderRadius: '999px',
    color: 'var(--cocoso-colors-theme-800)',
    fontWeight: 600,
    padding: '0.4rem 0.9rem',
    textDecoration: 'none',
  },
  '& a:hover': {
    backgroundColor: 'var(--cocoso-colors-theme-800)',
    color: 'white',
  },
});

// From this width where the place is (map, address) and who to ask sit in
// a column beside the card, from the top of the page; below it they follow
// the card.
const SIDEBAR = '@media (min-width: 1024px)';

const Layout = styled('div', {
  display: 'grid',
  gridTemplateAreas: '"card" "side" "rest"',
  gridTemplateColumns: 'minmax(0, 1fr)',
  [SIDEBAR]: {
    columnGap: '2rem',
    gridTemplateAreas: '"card side" "rest side"',
    gridTemplateColumns: 'minmax(0, 1fr) 360px',
    gridTemplateRows: 'auto 1fr',
  },
});

const CardArea = styled('div', { gridArea: 'card', minWidth: 0 });
const RestArea = styled('div', { gridArea: 'rest', minWidth: 0 });

const Sidebar = styled('aside', {
  gridArea: 'side',
  margin: '0 auto 2.5rem',
  maxWidth: '980px',
  width: '100%',
  [SIDEBAR]: {
    alignSelf: 'start',
    margin: 0,
    position: 'sticky',
    top: '1rem',
  },
});

// The same small heading as the sections of the event page.
const SideTitle = styled('h2', {
  color: 'var(--cocoso-tegel)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  margin: 0,
  textTransform: 'uppercase',
});

// A place's page: the card with its picture and what it is with, beside it,
// the address on a map and who to ask; then what it is made of, more
// pictures and documents.
export default function ResourceHybrid({
  documents,
  resource,
  siteDoc,
}: ResourceHybridProps) {
  const [tc] = useTranslation('common');
  const prefix = useLocationPrefix();
  if (!resource) {
    return null;
  }

  const images = (
    resource.images?.length ? resource.images : [resource.imageUrl]
  ).filter((img): img is string => Boolean(img));

  const resourcesInMenu = siteDoc?.settings?.menu?.find(
    (item) => item.name === 'resources'
  );

  const withContact = hasContact(resource.contact);
  // Booked in the calendar (the `bookings` feature), or else a place that
  // says how to book it
  const isBookable = isFeatureEnabled('bookings')
    ? resource.isBookable
    : Boolean(resource.booking);

  return (
    <LightboxProvider alt={resource.label} images={images}>
      <EntryPage>
        <EntryMeta
          description={plainText(resource.description)}
          image={images[0]}
          path={`/resources/${resource._id}`}
          title={resource.label}
        />

        <EntryTopBar
          backLink={{ value: '/resources', label: resourcesInMenu?.label }}
        />

        <Layout>
          <CardArea>
            <EntryHero
              chips={
                <>
                  <LocationTag locationId={resource.locationId} />
                  {resource.isCombo && (
                    <Chip>
                      <LayersIcon aria-hidden />
                      {tc('entry.combo')}
                    </Chip>
                  )}
                  {isBookable && (
                    <Chip>
                      <CalendarCheckIcon aria-hidden />
                      <Trans i18nKey="common:labels.bookable">Bookable</Trans>
                    </Chip>
                  )}
                </>
              }
              html={resource.description}
              meta={
                resource.capacity ? (
                  <span>
                    <UsersIcon aria-hidden />
                    {tc('entry.capacity', { count: resource.capacity })}
                  </span>
                ) : null
              }
              picture={
                <FilledPicture
                  alt={resource.label}
                  seed={resource._id}
                  src={images[0]}
                />
              }
              title={resource.label}
            />
          </CardArea>

          {hasAddress(resource.address) || withContact || resource.booking ? (
            <Sidebar>
              {resource.booking && (
                <Panel css={{ marginBottom: '1.25rem' }}>
                  <SideTitle>{tc('entry.booking')}</SideTitle>
                  <BookingInfo
                    booking={resource.booking}
                    label={resource.label}
                  />
                </Panel>
              )}
              <Panel css={{ overflow: 'hidden' }}>
                <AddressBlock
                  address={resource.address}
                  contact={resource.contact}
                  edge="top"
                  heading={
                    <SideTitle>
                      {tc(
                        withContact
                          ? 'address.titleWithContact'
                          : 'address.title'
                      )}
                    </SideTitle>
                  }
                  label={resource.label}
                />
              </Panel>
            </Sidebar>
          ) : null}

          <RestArea>
            {resource.isCombo && resource.resourcesForCombo?.length ? (
              <EntryColumn>
                <SectionHead>
                  <h2>{tc('entry.comboParts')}</h2>
                </SectionHead>
                <Parts>
                  {resource.resourcesForCombo.map((part) => (
                    <Link key={part._id} to={`${prefix}/resources/${part._id}`}>
                      {part.label}
                    </Link>
                  ))}
                </Parts>
              </EntryColumn>
            ) : null}

            {images.length > 1 && (
              <EntryColumn>
                <SectionHead>
                  <h2>{tc('entry.pictures')}</h2>
                </SectionHead>
                <MorePictures alt={resource.label} images={images} />
              </EntryColumn>
            )}

            {documents && documents[0] && (
              <EntryColumn>
                <SectionHead>
                  <h2>
                    <Trans i18nKey="common:documents.label">Documents</Trans>
                  </h2>
                </SectionHead>
                <Panel>
                  <DocumentsField
                    contextType="resources"
                    contextId={resource._id}
                  />
                </Panel>
              </EntryColumn>
            )}
          </RestArea>
        </Layout>
      </EntryPage>
    </LightboxProvider>
  );
}

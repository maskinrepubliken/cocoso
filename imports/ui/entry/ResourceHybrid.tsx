import { Link } from 'react-router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import UsersIcon from 'lucide-react/dist/esm/icons/users';
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
import BookableChip from '/imports/ui/generic/BookableChip';
import { publicUrl } from '/imports/api/_utils/shared';
import { resourceShareImageUrl } from '/imports/api/share/shareImage';
import { shareText } from '/imports/ui/layout/ShareMeta';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { placeStructuredData } from '/imports/ui/utils/structuredData';

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
  kinds?: string[] | null;
  category?: { key?: string } | null;
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

  // A shared link shows the generated picture with the name, kind,
  // description and address
  const path = `/resources/${resource._id}`;
  const shareImage = resourceShareImageUrl(resource) || undefined;

  const withContact = hasContact(resource.contact);
  // Places made up of others are for booking in the calendar too
  const isCombo = isFeatureEnabled('bookings') && resource.isCombo;

  return (
    <LightboxProvider alt={resource.label} images={images}>
      <EntryPage>
        <EntryMeta
          description={plainText(resource.description)}
          image={shareImage}
          generatedImage
          path={path}
          title={resource.label}
          type="website"
          coordinates={resource.address?.coordinates}
          structuredData={placeStructuredData({
            name: resource.label,
            description: shareText(resource.description, 300),
            url: publicUrl(path),
            image: getImageUrl(images[0], 'full') || shareImage,
            coordinates: resource.address?.coordinates,
            address: resource.address,
          })}
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
                  {isCombo && (
                    <Chip>
                      <LayersIcon aria-hidden />
                      {tc('entry.combo')}
                    </Chip>
                  )}
                  <BookableChip place={resource} />
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
              {/* How to book it, under where it is */}
              {resource.booking && (
                <Panel css={{ marginTop: '1.25rem' }}>
                  <SideTitle>{tc('entry.booking')}</SideTitle>
                  <BookingInfo
                    booking={resource.booking}
                    label={resource.label}
                  />
                </Panel>
              )}
            </Sidebar>
          ) : null}

          <RestArea>
            {isCombo && resource.resourcesForCombo?.length ? (
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

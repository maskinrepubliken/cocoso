import { Link } from 'react-router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import UsersIcon from 'lucide-react/dist/esm/icons/users';
import CalendarCheckIcon from 'lucide-react/dist/esm/icons/calendar-check';
import LayersIcon from 'lucide-react/dist/esm/icons/layers';

import { styled } from '/stitches.config';
import DocumentsField from '/imports/ui/pages/resources/components/DocumentsField';
import type { Document, Site, ResourceForCombo } from '/imports/ui/types';
import {
  useLocationName,
  useLocationPrefix,
} from '/imports/ui/utils/useLocation';
import {
  AddressDetails,
  ContactDetails,
} from '/imports/ui/generic/ContactDetails';
import PlaceMap from '/imports/ui/generic/PlaceMap';
import { hasAddress, type Address } from '/imports/api/_utils/address';
import { hasContact, type Contact } from '/imports/api/_utils/contact';

import EntryHero, {
  Chip,
  EntryColumn,
  EntryMeta,
  EntryPage,
  EntryTopBar,
  FramedPicture,
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

// From this width the address, map and contact sit in a column to the
// right of the card; below it they come right after the card.
const SIDEBAR = '@media (min-width: 1024px)';

const Layout = styled('div', {
  display: 'grid',
  gridTemplateAreas: '"card" "side" "rest"',
  gridTemplateColumns: 'minmax(0, 1fr)',
  [SIDEBAR]: {
    columnGap: '2rem',
    gridTemplateAreas: '"card side" "rest side"',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
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

const SideTitle = styled('h2', {
  color: 'var(--cocoso-tegel)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  margin: '0 0 0.875rem',
  textTransform: 'uppercase',
});

const SideBlock = styled('div', {
  '& + &': {
    borderTop: '1px solid var(--cocoso-colors-theme-100)',
    marginTop: '1rem',
    paddingTop: '1rem',
  },
});

const MapBox = styled('div', { margin: '0 -0.5rem 1rem' });

// A place's page: the card with its picture and what it is, and beside it
// (below it on narrow screens) where it is on the map and who to ask; then
// what it is made of, more pictures and documents.
export default function ResourceHybrid({
  documents,
  resource,
  siteDoc,
}: ResourceHybridProps) {
  const [tc] = useTranslation('common');
  const prefix = useLocationPrefix();
  const locationName = useLocationName(resource?.locationId);
  if (!resource) {
    return null;
  }

  const images = (
    resource.images?.length ? resource.images : [resource.imageUrl]
  ).filter((img): img is string => Boolean(img));

  const resourcesInMenu = siteDoc?.settings?.menu?.find(
    (item) => item.name === 'resources'
  );

  const coordinates = resource.address?.coordinates;
  const withContact = hasContact(resource.contact);

  return (
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
                <Chip accent>{tc('entry.place')}</Chip>
                {locationName && (
                  <Chip>
                    <MapPinIcon aria-hidden />
                    {locationName}
                  </Chip>
                )}
                {resource.isCombo && (
                  <Chip>
                    <LayersIcon aria-hidden />
                    {tc('entry.combo')}
                  </Chip>
                )}
                {resource.isBookable && (
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
              <FramedPicture
                alt={resource.label}
                seed={resource._id}
                src={images[0]}
              />
            }
            title={resource.label}
          />
        </CardArea>

        {hasAddress(resource.address) || withContact ? (
          <Sidebar>
            <Panel>
              {hasAddress(resource.address) && (
                <SideBlock>
                  <SideTitle>{tc('address.title')}</SideTitle>
                  {coordinates && (
                    <MapBox>
                      <PlaceMap
                        coordinates={coordinates}
                        label={resource.label}
                      />
                    </MapBox>
                  )}
                  <AddressDetails address={resource.address} />
                </SideBlock>
              )}
              {withContact && (
                <SideBlock>
                  <SideTitle>{tc('contact.title')}</SideTitle>
                  <ContactDetails contact={resource.contact} />
                </SideBlock>
              )}
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
  );
}

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
import { useLocationName, useLocationPrefix } from '/imports/ui/utils/useLocation';

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

// A place's page: the card with its picture and what it is, then what it
// is made of, more pictures and documents.
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
            <DocumentsField contextType="resources" contextId={resource._id} />
          </Panel>
        </EntryColumn>
      )}
    </EntryPage>
  );
}

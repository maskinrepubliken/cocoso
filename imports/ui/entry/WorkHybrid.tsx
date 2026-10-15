import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import React from 'react';
import dayjs from 'dayjs';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import UserIcon from 'lucide-react/dist/esm/icons/user';
import MessageIcon from 'lucide-react/dist/esm/icons/message-circle';

import { styled } from '/stitches.config';
import DocumentsField from '/imports/ui/pages/resources/components/DocumentsField';
import { findRequestKind } from '/imports/ui/pages/works/requestKinds';
import type { Document, Site } from '/imports/ui/types';

import LocationTag from '/imports/ui/generic/LocationTag';

import EntryHero, {
  Actions,
  Chip,
  EntryColumn,
  EntryMeta,
  EntryPage,
  EntryTopBar,
  FramedPicture,
  IconPicture,
  MorePictures,
  Panel,
  SectionHead,
} from './EntryHero';

interface Work {
  _id: string;
  title?: string;
  authorUsername?: string;
  authorAvatar?: string;
  shortDescription?: string;
  longDescription?: string;
  additionalInfo?: string;
  contactInfo?: string;
  creationDate?: Date | string;
  imageUrl?: string;
  images?: string[];
  showAvatar?: boolean;
  category?: {
    label?: string;
  };
}

export interface WorkHybridProps {
  documents?: Document[];
  work: Work;
  siteDoc: Site;
}

const ProfileLink = styled(Link, {
  alignItems: 'center',
  border: '1.5px solid var(--cocoso-colors-theme-800)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'inline-flex',
  fontSize: '0.92rem',
  fontWeight: 600,
  gap: '0.45rem',
  padding: '0.3rem 0.95rem 0.3rem 0.3rem',
  textDecoration: 'none',
  '& img': {
    borderRadius: '50%',
    height: '1.8rem',
    objectFit: 'cover',
    width: '1.8rem',
  },
  '&:hover': {
    backgroundColor: 'var(--cocoso-colors-theme-800)',
    color: 'white',
  },
});

const ContactNote = styled('p', {
  alignItems: 'flex-start',
  backgroundColor: 'var(--cocoso-colors-theme-50)',
  borderRadius: '12px',
  display: 'flex',
  gap: '0.5rem',
  margin: 0,
  padding: '0.7rem 0.9rem',
  whiteSpace: 'pre-line',
  '& svg': {
    color: 'var(--cocoso-colors-theme-800)',
    flexShrink: 0,
    height: '1.1rem',
    marginTop: '0.15rem',
    width: '1.1rem',
  },
});

// A request's page: the card with its kind, what is asked or offered and
// who to ask, then any extra details, pictures and documents.
export default function WorkHybrid({ documents, work, siteDoc }: WorkHybridProps) {
  const [tc] = useTranslation('common');
  if (!work) {
    return null;
  }

  const kind = findRequestKind(work.category?.label);
  const KindIcon = kind?.icon;
  const images = (work.images?.length ? work.images : [work.imageUrl]).filter(
    (img): img is string => Boolean(img)
  );
  const worksInMenu = siteDoc?.settings?.menu.find(
    (item) => item.name === 'works'
  );
  const author = work.showAvatar !== false ? work.authorUsername : null;

  return (
    <EntryPage>
      <EntryMeta
        description={work.shortDescription}
        image={images[0]}
        path={`/@${work.authorUsername}/works/${work._id}`}
        title={work.title}
      />

      <EntryTopBar backLink={{ value: '/works', label: worksInMenu?.label }} />

      <EntryHero
        chips={
          <>
            {(kind || work.category?.label) && (
              <Chip accent>
                {KindIcon && <KindIcon aria-hidden />}
                {kind
                  ? tc(`requests.kinds.${kind.key}.name`)
                  : work.category?.label}
              </Chip>
            )}
            <LocationTag
              isMunicipalityOnly={(work as any).isMunicipalityOnly}
              locationId={(work as any).locationId}
            />
          </>
        }
        html={work.longDescription}
        meta={
          <>
            {work.creationDate && (
              <span>
                <CalendarIcon aria-hidden />
                {dayjs(work.creationDate).format('D MMMM YYYY')}
              </span>
            )}
            {author && (
              <span>
                <UserIcon aria-hidden />
                {tc('entry.postedBy', { name: author })}
              </span>
            )}
          </>
        }
        picture={
          images.length > 0 ? (
            <FramedPicture alt={work.title} seed={work._id} src={images[0]} />
          ) : KindIcon ? (
            <IconPicture color={kind?.color} icon={KindIcon} />
          ) : (
            <FramedPicture alt={work.title} seed={work._id} />
          )
        }
        subtitle={work.shortDescription}
        title={work.title}
      >
        {work.contactInfo && (
          <ContactNote>
            <MessageIcon aria-hidden />
            {work.contactInfo}
          </ContactNote>
        )}
        {author && (
          <Actions>
            <ProfileLink to={`/@${work.authorUsername}`}>
              {work.authorAvatar ? (
                <img alt="" src={work.authorAvatar} />
              ) : (
                <UserIcon aria-hidden />
              )}
              {tc('entry.seeProfile', { name: author })}
            </ProfileLink>
          </Actions>
        )}
      </EntryHero>

      {work.additionalInfo && work.additionalInfo.length > 2 && (
        <EntryColumn>
          <SectionHead>
            <h2>
              <Trans i18nKey="common:labels.extra">Extra</Trans>
            </h2>
          </SectionHead>
          <Panel>{work.additionalInfo}</Panel>
        </EntryColumn>
      )}

      {images.length > 1 && (
        <EntryColumn>
          <SectionHead>
            <h2>{tc('entry.pictures')}</h2>
          </SectionHead>
          <MorePictures alt={work.title} images={images} />
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
            <DocumentsField contextType="works" contextId={work._id} />
          </Panel>
        </EntryColumn>
      )}
    </EntryPage>
  );
}

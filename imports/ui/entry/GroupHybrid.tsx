import { Trans, useTranslation } from 'react-i18next';
import React from 'react';
import UsersIcon from 'lucide-react/dist/esm/icons/users';
import LockIcon from 'lucide-react/dist/esm/icons/lock';
import { LightboxProvider } from '/imports/ui/generic/Lightbox';

import GroupDocuments from '../generic/Documents';
import GroupMembers from '/imports/ui/pages/groups/components/GroupMembers';
import type { Document, Site } from '/imports/ui/types';
import { ContactDetails } from '/imports/ui/generic/ContactDetails';
import { hasContact, type Contact } from '/imports/api/_utils/contact';

import ActionDates, { DateOccurrence } from './ActionDates';
import LocationTag from '/imports/ui/generic/LocationTag';

import EntryHero, {
  Actions,
  Chip,
  EntryColumn,
  EntryMeta,
  EntryPage,
  EntryTopBar,
  FramedPicture,
  Panel,
  SectionHead,
  plainText,
} from './EntryHero';

interface Group {
  _id: string;
  title?: string;
  description?: string;
  contact?: Contact | null;
  readingMaterial?: string;
  imageUrl?: string;
  isPrivate?: boolean;
  meetings?: DateOccurrence[];
  members?: any[];
}

export interface GroupHybridProps {
  group: Group;
  documents?: Document[];
  siteDoc: Site;
}

// A förening's page: the card with its picture, framed like a place's, what
// it is and who is in it, then its meetings and documents.
export default function GroupHybrid({
  group,
  documents,
  siteDoc,
}: GroupHybridProps) {
  const [tc] = useTranslation('common');
  if (!group) {
    return null;
  }

  const groupsInMenu = siteDoc.settings?.menu.find(
    (item: any) => item.name === 'groups'
  );
  const memberCount = group.members?.length || 0;
  const meetings = { ...group, datesAndTimes: group.meetings };
  const hasMeetings = Boolean(group.meetings?.length);

  return (
    <LightboxProvider alt={group.title} images={[group.imageUrl]}>
      <EntryPage>
        <EntryMeta
          description={group.readingMaterial || plainText(group.description)}
          image={group.imageUrl}
          path={`/groups/${group._id}`}
          title={group.title}
        />

        <EntryTopBar
          backLink={{ value: '/groups', label: groupsInMenu?.label }}
        />

        <EntryHero
          chips={
            <>
              <Chip accent>{tc('entry.group')}</Chip>
              <LocationTag
                isMunicipalityOnly={(group as any).isMunicipalityOnly}
                locationId={(group as any).locationId}
              />
              {group.isPrivate && (
                <Chip>
                  <LockIcon aria-hidden />
                  <Trans i18nKey="common:labels.private">Private</Trans>
                </Chip>
              )}
            </>
          }
          html={group.description}
          meta={
            memberCount > 0 ? (
              <span>
                <UsersIcon aria-hidden />
                {tc('entry.members', { count: memberCount })}
              </span>
            ) : null
          }
          picture={
            <FramedPicture
              alt={group.title}
              seed={group._id}
              src={group.imageUrl}
            />
          }
          subtitle={group.readingMaterial}
          title={group.title}
        >
          {memberCount > 0 && (
            <Actions css={{ marginLeft: '-1rem' }}>
              <GroupMembers group={group} />
            </Actions>
          )}
        </EntryHero>

        {hasContact(group.contact) && (
          <EntryColumn>
            <SectionHead>
              <h2>{tc('contact.title')}</h2>
            </SectionHead>
            <Panel>
              <ContactDetails contact={group.contact} subject={group.title} />
            </Panel>
          </EntryColumn>
        )}

        {hasMeetings && (
          <EntryColumn>
            <SectionHead>
              <h2>{tc('entry.meetings')}</h2>
            </SectionHead>
            <Panel>
              <ActionDates activity={meetings} />
            </Panel>
          </EntryColumn>
        )}

        {documents && documents.length > 0 && (
          <EntryColumn>
            <SectionHead>
              <h2>
                <Trans i18nKey="common:documents.label">Documents</Trans>
              </h2>
            </SectionHead>
            <Panel>
              <GroupDocuments documents={documents} />
            </Panel>
          </EntryColumn>
        )}
      </EntryPage>
    </LightboxProvider>
  );
}

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MailIcon from 'lucide-react/dist/esm/icons/mail';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import XIcon from 'lucide-react/dist/esm/icons/x';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';

import FormField from '/imports/ui/forms/FormField';
import ContactFields from '/imports/ui/forms/ContactFields';
import type { Contact } from '/imports/api/_utils/contact';
import type { Address } from '/imports/api/_utils/address';

import OptionCards from './OptionCards';
import PersonCard, { PersonAvatar, personName } from './PersonCard';
import PickerPopover from './PickerPopover';

// What the form knows about an organizer: from getOrganizerOptions, and
// for the one chosen as organizer, from getOrganizerDefaults.
export interface OrganizerOption {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
}

export interface OrganizerDefaults extends OrganizerOption {
  publicContact: Contact | null;
  address: Address | null;
  locationId: string | null;
}

export interface OrganizerRef {
  userId: string;
  username: string;
}

export type ContactMode = 'organizer' | 'own';

export const organizerName = personName;

const searchText = (o: OrganizerOption) =>
  [o.firstName, o.lastName, o.username].filter(Boolean).join(' ');

// A row in the organizer picker: picture, name, @username
function OrganizerRow({ organizer }: { organizer: OrganizerOption }) {
  return (
    <>
      <PersonAvatar person={organizer} size={32} />
      <span className="picker-row-text">
        <span className="picker-row-title">{personName(organizer)}</span>
        {(organizer.firstName || organizer.lastName) && (
          <span className="picker-row-detail">@{organizer.username}</span>
        )}
      </span>
    </>
  );
}

interface OrganizerFieldsProps {
  isAdmin: boolean;
  isOwnEvent: boolean;
  authorId: string;
  author: OrganizerDefaults | null;
  options: OrganizerOption[];
  organizers: OrganizerRef[];
  contactMode: ContactMode;
  contact: Contact;
  // Where the organizer edits the details the form starts from
  profileLink: string;
  onAuthorChange: (authorId: string) => void;
  onOrganizersChange: (organizers: OrganizerRef[]) => void;
  onContactModeChange: (mode: ContactMode) => void;
  onContactChange: (contact: Contact) => void;
}

// Who runs the event and how to reach them. The organizer is the person
// creating it (an admin may name anyone); co-organizers are added from the
// other organizers. Contact details come from the organizer's profile
// unless the event gets details of its own.
export default function OrganizerFields({
  isAdmin,
  isOwnEvent,
  authorId,
  author,
  options,
  organizers,
  contactMode,
  contact,
  profileLink,
  onAuthorChange,
  onOrganizersChange,
  onContactModeChange,
  onContactChange,
}: OrganizerFieldsProps) {
  const [t] = useTranslation('activities');

  const [picking, setPicking] = useState<'author' | 'co' | null>(null);

  const authorPerson = options.find((o) => o._id === authorId) || author;
  const chosenIds = new Set(organizers.map((o) => o.userId));
  const coPeople = organizers
    .filter((o) => o.userId !== authorId)
    .map(
      (o) =>
        options.find((option) => option._id === o.userId) || {
          _id: o.userId,
          username: o.username,
        }
    );
  const coCandidates = options.filter(
    (o) => o._id !== authorId && !chosenIds.has(o._id)
  );

  const picker = (
    items: OrganizerOption[],
    onPick: (o: OrganizerOption) => void
  ) => (
    <PickerPopover
      emptyText={t('form.organizers.empty')}
      getKey={(o) => o._id}
      getSearchText={searchText}
      items={items}
      placeholder={t('form.organizers.search')}
      renderItem={(o) => <OrganizerRow organizer={o} />}
      onClose={() => setPicking(null)}
      onPick={(o) => {
        onPick(o);
        setPicking(null);
      }}
    />
  );

  const profileContact = author?.publicContact;
  const hasProfileContact = Boolean(
    profileContact &&
      (profileContact.email || profileContact.phone || profileContact.website)
  );

  return (
    <>
      <FormField
        helper={isAdmin ? t('form.author.helperAdmin') : undefined}
        label={t('form.author.label')}
        my="3"
      >
        <div className="picker-anchor">
          <PersonCard
            action={
              isAdmin ? (
                <button
                  type="button"
                  className="person-card-button"
                  aria-expanded={picking === 'author'}
                  onClick={() =>
                    setPicking(picking === 'author' ? null : 'author')
                  }
                >
                  {t('form.author.change')}
                </button>
              ) : undefined
            }
            note={isOwnEvent ? t('form.author.youNote') : undefined}
            person={authorPerson}
          />
          {picking === 'author' &&
            picker(options, (o) => onAuthorChange(o._id))}
        </div>
      </FormField>

      <FormField
        helper={t('form.organizers.helper')}
        label={t('form.organizers.label')}
        my="3"
      >
        <div className="person-list">
          {coPeople.map((person) => (
            <PersonCard
              key={person._id}
              action={
                <button
                  type="button"
                  className="person-card-remove"
                  aria-label={t('form.organizers.remove', {
                    name: personName(person),
                  })}
                  onClick={() =>
                    onOrganizersChange(
                      organizers.filter((o) => o.userId !== person._id)
                    )
                  }
                >
                  <XIcon width={16} height={16} />
                </button>
              }
              person={person}
              size={34}
            />
          ))}
          <div className="picker-anchor">
            <button
              type="button"
              className="person-add"
              aria-expanded={picking === 'co'}
              disabled={coCandidates.length === 0}
              onClick={() => setPicking(picking === 'co' ? null : 'co')}
            >
              <PlusIcon aria-hidden width={16} height={16} />
              {t('form.organizers.add')}
            </button>
            {picking === 'co' &&
              picker(coCandidates, (o) =>
                onOrganizersChange([
                  ...organizers,
                  { userId: o._id, username: o.username },
                ])
              )}
          </div>
        </div>
      </FormField>

      <FormField label={t('form.contact.label')} my="3">
        <OptionCards
          label={t('form.contact.label')}
          value={contactMode}
          onChange={onContactModeChange}
          options={[
            {
              value: 'organizer',
              title: t('form.contact.fromOrganizer'),
              description: t('form.contact.fromOrganizerHelper'),
              content: (
                <>
                  {hasProfileContact ? (
                    <ul className="form-preview-lines">
                      {profileContact?.email && (
                        <li>
                          <MailIcon aria-hidden />
                          {profileContact.email}
                        </li>
                      )}
                      {profileContact?.phone && (
                        <li>
                          <PhoneIcon aria-hidden />
                          {profileContact.phone}
                        </li>
                      )}
                      {profileContact?.website && (
                        <li>
                          <GlobeIcon aria-hidden />
                          {profileContact.website.replace(/^https?:\/\//i, '')}
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="form-preview-empty">
                      {t('form.contact.none')}
                    </p>
                  )}
                  <a
                    className="form-preview-link"
                    href={profileLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {t('form.editProfile')}
                  </a>
                </>
              ),
            },
            {
              value: 'own',
              title: t('form.contact.own'),
              description: t('form.contact.ownHelper'),
              content: (
                <ContactFields value={contact} onChange={onContactChange} />
              ),
            },
          ]}
        />
      </FormField>
    </>
  );
}

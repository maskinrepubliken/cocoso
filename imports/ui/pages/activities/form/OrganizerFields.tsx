import React from 'react';
import { useTranslation } from 'react-i18next';
import AutoCompleteSelect from 'react-select';
import makeAnimated from 'react-select/animated';
import MailIcon from 'lucide-react/dist/esm/icons/mail';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';

import FormField from '/imports/ui/forms/FormField';
import ContactFields from '/imports/ui/forms/ContactFields';
import type { Contact } from '/imports/api/_utils/contact';
import type { Address } from '/imports/api/_utils/address';

import ChoiceSwitch from './ChoiceSwitch';

const animatedComponents = makeAnimated();

// What the form knows about an organizer: from getOrganizerOptions, and
// for the one chosen as organizer, from getOrganizerDefaults.
export interface OrganizerOption {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
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

export const organizerName = (o?: Partial<OrganizerOption> | null) =>
  (o && [o.firstName, o.lastName].filter(Boolean).join(' ')) ||
  (o?.username ? `@${o.username}` : '');

const optionLabel = (o: OrganizerOption) => {
  const name = [o.firstName, o.lastName].filter(Boolean).join(' ');
  return name ? `${name} (@${o.username})` : `@${o.username}`;
};

const selectStyles = {
  control: (base: any) => ({
    ...base,
    borderRadius: 'var(--cocoso-radius-falt)',
  }),
};

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

  const authorOption =
    options.find((o) => o._id === authorId) || author || null;
  const coOptions = options.filter((o) => o._id !== authorId);
  const selectedCo = organizers
    .filter((o) => o.userId !== authorId)
    .map(
      (o) =>
        options.find((option) => option._id === o.userId) || {
          _id: o.userId,
          username: o.username,
        }
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
        my="6"
      >
        {isAdmin ? (
          <AutoCompleteSelect
            components={animatedComponents}
            options={options}
            placeholder={t('form.author.holder')}
            styles={selectStyles}
            value={authorOption as OrganizerOption | null}
            getOptionLabel={optionLabel}
            getOptionValue={(option) => option._id}
            onChange={(option) =>
              option && onAuthorChange((option as OrganizerOption)._id)
            }
          />
        ) : (
          <p className="form-static">
            {isOwnEvent
              ? t('form.author.you', { name: organizerName(author) })
              : organizerName(author)}
          </p>
        )}
      </FormField>

      <FormField
        helper={t('form.organizers.helper')}
        label={t('form.organizers.label')}
        my="6"
      >
        <AutoCompleteSelect
          isMulti
          components={animatedComponents}
          options={coOptions}
          placeholder={t('form.organizers.holder')}
          styles={selectStyles}
          value={selectedCo}
          getOptionLabel={optionLabel}
          getOptionValue={(option) => option._id}
          onChange={(chosen) =>
            onOrganizersChange(
              (chosen || []).map((o) => ({
                userId: o._id,
                username: o.username,
              }))
            )
          }
        />
      </FormField>

      <FormField label={t('form.contact.label')} my="6">
        <ChoiceSwitch
          choices={[
            { value: 'organizer', label: t('form.contact.fromOrganizer') },
            { value: 'own', label: t('form.contact.own') },
          ]}
          label={t('form.contact.label')}
          value={contactMode}
          onChange={onContactModeChange}
        />

        {contactMode === 'organizer' ? (
          <div className="form-preview">
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
              <p className="form-preview-empty">{t('form.contact.none')}</p>
            )}
            <p className="form-preview-note">
              {t('form.contact.fromOrganizerHelper')}{' '}
              <a href={profileLink} rel="noreferrer" target="_blank">
                {t('form.editProfile')}
              </a>
            </p>
          </div>
        ) : (
          <div className="form-preview">
            <p className="form-preview-note">{t('form.contact.ownHelper')}</p>
            <ContactFields value={contact} onChange={onContactChange} />
          </div>
        )}
      </FormField>
    </>
  );
}

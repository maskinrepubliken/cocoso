import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MailIcon from 'lucide-react/dist/esm/icons/mail';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import XIcon from 'lucide-react/dist/esm/icons/x';
import PhoneIcon from 'lucide-react/dist/esm/icons/phone';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';

import ContactFields from '/imports/ui/forms/ContactFields';
import type { Contact } from '/imports/api/_utils/contact';
import type { Address } from '/imports/api/_utils/address';

import ChoiceChips, { type Choice } from './ChoiceChips';
import PersonCard, { PersonAvatar, personName } from './PersonCard';
import PickerPopover from './PickerPopover';

// What the form knows about an organizer: from getOrganizerOptions, and
// for the organizer and the contact person, from getOrganizerDefaults.
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

// Whose contact details the event shows: an organizer's (their user id),
// or details of its own.
export const OWN_CONTACT = 'own';

export const organizerName = personName;

const searchText = (o: OrganizerOption) =>
  [o.firstName, o.lastName, o.username].filter(Boolean).join(' ');

const firstName = (o: Partial<OrganizerOption>) => o.firstName || personName(o);

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

// A person and their public contact details, as the event page will show
// them: a card like the chosen place's
function ContactPreview({
  person,
  contact,
  empty,
}: {
  person: Partial<OrganizerOption>;
  contact?: Contact | null;
  empty: string;
}) {
  const has = Boolean(
    contact && (contact.email || contact.phone || contact.website)
  );
  return (
    <div className="place-card">
      <PersonAvatar person={person} size={44} />
      <span className="person-card-text">
        <span className="person-card-name">{personName(person)}</span>
        {has ? (
          <span className="contact-card-lines">
            {contact?.email && (
              <span>
                <MailIcon aria-hidden />
                {contact.email}
              </span>
            )}
            {contact?.phone && (
              <span>
                <PhoneIcon aria-hidden />
                {contact.phone}
              </span>
            )}
            {contact?.website && (
              <span>
                <GlobeIcon aria-hidden />
                {contact.website.replace(/^https?:\/\//i, '')}
              </span>
            )}
          </span>
        ) : (
          <span className="person-card-note">{empty}</span>
        )}
      </span>
    </div>
  );
}

interface OrganizerFieldsProps {
  isAdmin: boolean;
  currentUserId?: string;
  authorId: string;
  author: OrganizerDefaults | null;
  options: OrganizerOption[];
  organizers: OrganizerRef[];
  // OWN_CONTACT, or the user id of the organizer whose details are shown
  contactChoice: string;
  // That organizer's profile, once fetched
  contactPerson: OrganizerDefaults | null;
  contact: Contact;
  onAuthorChange: (authorId: string) => void;
  onOrganizersChange: (organizers: OrganizerRef[]) => void;
  onContactChoiceChange: (choice: string) => void;
  onContactChange: (contact: Contact) => void;
}

// Who runs the event and how to reach them. The organizer is the person
// creating it (an admin may name anyone); co-organizers are added from the
// other organizers. The page shows one organizer's contact details from
// their profile, or details the event has of its own.
export default function OrganizerFields({
  isAdmin,
  currentUserId,
  authorId,
  author,
  options,
  organizers,
  contactChoice,
  contactPerson,
  contact,
  onAuthorChange,
  onOrganizersChange,
  onContactChoiceChange,
  onContactChange,
}: OrganizerFieldsProps) {
  const [t] = useTranslation('activities');

  const [picking, setPicking] = useState<'author' | 'co' | null>(null);

  const authorPerson: Partial<OrganizerOption> = options.find(
    (o) => o._id === authorId
  ) ||
    author || { _id: authorId, username: '' };
  const chosenIds = new Set(organizers.map((o) => o.userId));
  const coPeople: Partial<OrganizerOption>[] = organizers
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

  const contactChoices: Choice<string>[] = [
    ...[authorPerson, ...coPeople].map((person) => ({
      value: person._id || '',
      label:
        person._id === currentUserId
          ? t('form.contact.standard')
          : firstName(person),
      icon: <PersonAvatar person={person} size={26} />,
      content: (
        <ContactPreview
          contact={
            contactPerson?._id === person._id
              ? contactPerson?.publicContact
              : null
          }
          empty={t('form.contact.none')}
          person={person}
        />
      ),
    })),
    {
      value: OWN_CONTACT,
      label: t('form.contact.own'),
      icon: <PencilLineIcon aria-hidden />,
      content: <ContactFields value={contact} onChange={onContactChange} />,
    },
  ];

  return (
    <>
      {/* Seldom needed: small, in the card's top right corner */}
      <div className="picker-anchor organizer-foot">
        <button
          type="button"
          className="person-add-small"
          aria-expanded={picking === 'co'}
          disabled={coCandidates.length === 0}
          title={t('form.organizers.helper')}
          onClick={() => setPicking(picking === 'co' ? null : 'co')}
        >
          <PlusIcon aria-hidden width={14} height={14} />
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

      {/* The card is titled "Arrangörer": the people need no label of their own */}
      <div className="organizer-people">
        {isAdmin && (
          <p className="form-preview-note">{t('form.author.helperAdmin')}</p>
        )}
        <div className="person-list">
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
              note={
                authorId === currentUserId
                  ? t('form.author.youNote')
                  : undefined
              }
              person={authorPerson}
            />
            {picking === 'author' &&
              picker(options, (o) => onAuthorChange(o._id))}
          </div>
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
              note={t('form.organizers.note')}
              person={person}
            />
          ))}
        </div>
      </div>

      {/* A second heading in the same card, as the card's own */}
      <section className="organizer-contact">
        <h3 className="form-card-title">{t('form.contact.label')}</h3>
        <ChoiceChips
          choices={contactChoices}
          label={t('form.contact.label')}
          value={contactChoice}
          onChange={onContactChoiceChange}
        />
      </section>
    </>
  );
}

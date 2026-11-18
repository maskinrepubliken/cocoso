import React from 'react';
import { useTranslation } from 'react-i18next';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';
import NotebookPenIcon from 'lucide-react/dist/esm/icons/notebook-pen';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';

import { Input, Textarea } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import ContactFields, { emptyContact } from '/imports/ui/forms/ContactFields';
import type { Contact } from '/imports/api/_utils/contact';
import ChoiceChips, {
  type Choice,
} from '/imports/ui/pages/activities/form/ChoiceChips';
import { PersonAvatar } from '/imports/ui/pages/activities/form/PersonCard';
import {
  ContactPreview,
  type OrganizerDefaults,
} from '/imports/ui/pages/activities/form/OrganizerFields';

// How something is reached, as stored: one of them, or none
export interface Reach {
  contactUserId?: string | null;
  contact?: Contact | null;
  website?: string | null;
  contactNote?: string | null;
}

export type ReachVia = 'manager' | 'own' | 'website' | 'note';

// What the form edits; reachValue() turns it into what is saved
export interface ReachState {
  via: ReachVia;
  contactUserId: string;
  contact: Contact;
  website: string;
  contactNote: string;
}

export const reachState = (reach?: Reach | null): ReachState => ({
  via: reach?.contactUserId
    ? 'manager'
    : reach?.contactNote
    ? 'note'
    : reach?.contact
    ? 'own'
    : 'website',
  contactUserId: reach?.contactUserId || '',
  contact: { ...emptyContact, ...(reach?.contact || {}) },
  website: reach?.website || '',
  contactNote: reach?.contactNote || '',
});

// Only the chosen way is sent, the others as null
export const reachValue = (state: ReachState): Required<Reach> => ({
  contactUserId:
    state.via === 'manager' && state.contactUserId ? state.contactUserId : null,
  contact: state.via === 'own' ? { ...state.contact, website: '' } : null,
  website: state.via === 'website' ? state.website : null,
  contactNote: state.via === 'note' ? state.contactNote : null,
});

const OWN = 'own';
const WEBSITE = 'website';
const NOTE = 'note';

interface ReachFieldsProps {
  value: ReachState;
  onChange: (value: ReachState) => void;
  // The place's managers with their profiles, to be reached through one
  managers: OrganizerDefaults[];
  currentUserId?: string;
  label: string;
}

// How a commercial place or an offering is reached, chosen as a place's or
// an event's contact is: one of the place's managers (their profile's
// details), details of its own, its website, or a free note ("Bokas
// direkt hos Lena").
export default function ReachFields({
  value,
  onChange,
  managers,
  currentUserId,
  label,
}: ReachFieldsProps) {
  const [tc] = useTranslation('common');
  const [ta] = useTranslation('activities');

  const set = (patch: Partial<ReachState>) => onChange({ ...value, ...patch });

  const choices: Choice<string>[] = [
    ...managers.map((person) => ({
      value: person._id,
      label:
        person._id === currentUserId
          ? ta('form.contact.standard')
          : person.firstName || person.username,
      icon: <PersonAvatar person={person} size={26} />,
      content: (
        <ContactPreview
          contact={person.publicContact}
          empty={ta('form.contact.none')}
          person={person}
        />
      ),
    })),
    {
      value: OWN,
      label: tc('offerings.form.reach.own'),
      icon: <PencilLineIcon aria-hidden />,
      content: (
        <ContactFields
          value={value.contact}
          withWebsite={false}
          onChange={(contact) => set({ contact })}
        />
      ),
    },
    {
      value: WEBSITE,
      label: tc('offerings.form.reach.website'),
      icon: <GlobeIcon aria-hidden />,
      content: (
        <FormField helper={tc('offerings.form.reach.websiteHelper')}>
          <Input
            autoComplete="url"
            placeholder="https://"
            type="url"
            value={value.website}
            onChange={(e) => set({ website: e.target.value })}
          />
        </FormField>
      ),
    },
    {
      value: NOTE,
      label: tc('offerings.form.reach.note'),
      icon: <NotebookPenIcon aria-hidden />,
      content: (
        <FormField helper={tc('offerings.form.reach.noteHelper')}>
          <Textarea
            placeholder={tc('offerings.form.reach.noteHolder')}
            rows={3}
            value={value.contactNote}
            onChange={(e) => set({ contactNote: e.target.value })}
          />
        </FormField>
      ),
    },
  ];

  // A manager no longer among them falls back to details of its own
  const chosen =
    value.via === 'manager'
      ? managers.some((m) => m._id === value.contactUserId)
        ? value.contactUserId
        : OWN
      : value.via;

  return (
    <ChoiceChips
      choices={choices}
      label={label}
      value={chosen}
      onChange={(choice) =>
        [OWN, WEBSITE, NOTE].includes(choice)
          ? set({ via: choice as ReachVia })
          : set({ via: 'manager', contactUserId: choice })
      }
    />
  );
}

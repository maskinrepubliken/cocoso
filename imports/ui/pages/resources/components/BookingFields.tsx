import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';

import { Input, Textarea } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import ContactFields, { emptyContact } from '/imports/ui/forms/ContactFields';
import { hasContact, type Contact } from '/imports/api/_utils/contact';
import { call } from '/imports/api/_utils/shared';
import ChoiceChips, {
  type Choice,
} from '/imports/ui/pages/activities/form/ChoiceChips';
import { PersonAvatar } from '/imports/ui/pages/activities/form/PersonCard';
import ToggleSwitch from '/imports/ui/pages/activities/form/ToggleSwitch';
import {
  ContactPreview,
  type OrganizerDefaults,
} from '/imports/ui/pages/activities/form/OrganizerFields';

// How a bookable place is booked: through a person (their public
// contact details), details of its own, or a link.
export type BookingVia = 'organizer' | 'own' | 'link';

// What the form edits; bookingValue() turns it into what is saved.
export interface BookingState {
  // "Platsen går att boka": the place says how it is booked (`booking`)
  canBeBooked: boolean;
  info: string;
  via: BookingVia;
  contactUserId: string;
  contact: Contact;
  url: string;
}

// What is stored on the place (imports/api/resources/resource.booking.js)
export interface Booking {
  info?: string;
  url?: string;
  contactUserId?: string;
  contact?: Contact;
}

export const bookingState = (booking?: Booking | null): BookingState => ({
  canBeBooked: Boolean(booking),
  info: booking?.info || '',
  via: booking?.url
    ? 'link'
    : hasContact(booking?.contact)
    ? 'own'
    : 'organizer',
  contactUserId: booking?.contactUserId || '',
  contact: { ...emptyContact, ...(booking?.contact || {}) },
  url: booking?.url || '',
});

// Only the chosen way to book is sent; null when the place is not bookable.
export const bookingValue = (state: BookingState): Booking | null => {
  if (!state.canBeBooked) {
    return null;
  }
  const info = state.info.trim() ? { info: state.info } : {};
  if (state.via === 'link') {
    return { ...info, url: state.url };
  }
  if (state.via === 'own') {
    return { ...info, contact: state.contact };
  }
  return state.contactUserId
    ? { ...info, contactUserId: state.contactUserId }
    : info;
};

interface BookingFieldsProps {
  value: BookingState;
  onChange: (value: BookingState) => void;
  // The place's managers with their profiles, to book through one of them
  managers: OrganizerDefaults[];
  currentUserId?: string;
}

const OWN = 'own';
const LINK = 'link';

// Whether the place can be booked and how: a switch, a few words about
// booking it, and who to turn to, chosen as its contact is: one of its
// managers (their profile's details) or details of its own; or a link to
// where it is booked.
export default function BookingFields({
  value,
  onChange,
  managers,
  currentUserId,
}: BookingFieldsProps) {
  const [t] = useTranslation('resources');
  const [ta] = useTranslation('activities');
  const [person, setPerson] = useState<OrganizerDefaults | null>(null);

  const set = (patch: Partial<BookingState>) =>
    onChange({ ...value, ...patch });

  // Booked through someone who is not (or no longer) among its managers:
  // they stay a choice, with their profile's details
  const isOtherPerson =
    value.via === 'organizer' &&
    Boolean(value.contactUserId) &&
    !managers.some((m) => m._id === value.contactUserId);
  useEffect(() => {
    if (!isOtherPerson) {
      setPerson(null);
      return undefined;
    }
    let cancelled = false;
    call<OrganizerDefaults>('getOrganizerDefaults', value.contactUserId)
      .then((defaults) => !cancelled && setPerson(defaults))
      .catch(() => !cancelled && setPerson(null));
    return () => {
      cancelled = true;
    };
  }, [isOtherPerson, value.contactUserId]);

  const people = [...managers, ...(isOtherPerson && person ? [person] : [])];

  const choices: Choice<string>[] = [
    ...people.map((p) => ({
      value: p._id,
      label:
        p._id === currentUserId ? ta('form.contact.standard') : p.firstName || p.username,
      icon: <PersonAvatar person={p} size={26} />,
      content: (
        <ContactPreview
          contact={p.publicContact}
          empty={ta('form.contact.none')}
          person={p}
        />
      ),
    })),
    {
      value: OWN,
      label: t('form.booking.own'),
      icon: <PencilLineIcon aria-hidden />,
      content: (
        <ContactFields
          value={value.contact}
          onChange={(contact) => set({ contact })}
        />
      ),
    },
    {
      value: LINK,
      label: t('form.booking.link'),
      icon: <LinkIcon aria-hidden />,
      content: (
        <FormField
          label={t('form.booking.url')}
          helper={t('form.booking.urlHelper')}
        >
          <Input
            placeholder="https://"
            type="url"
            value={value.url}
            onChange={(e) => set({ url: e.target.value })}
          />
        </FormField>
      ),
    },
  ];

  const chosen =
    value.via === 'organizer' ? value.contactUserId : value.via === 'own' ? OWN : LINK;

  return (
    <>
      <ToggleSwitch
        checked={value.canBeBooked}
        helper={t('form.booking.switchHelper')}
        label={t('form.booking.switch')}
        onChange={(canBeBooked) => set({ canBeBooked })}
      />
      {value.canBeBooked && (
        <>
          <FormField
            label={t('form.booking.info')}
            helper={t('form.booking.infoHelper')}
          >
            <Textarea
              rows={3}
              value={value.info}
              onChange={(e) => set({ info: e.target.value })}
            />
          </FormField>
          <ChoiceChips
            choices={choices}
            label={t('form.booking.how')}
            value={chosen}
            onChange={(choice) =>
              choice === OWN
                ? set({ via: 'own' })
                : choice === LINK
                  ? set({ via: 'link' })
                  : set({ via: 'organizer', contactUserId: choice })
            }
          />
        </>
      )}
    </>
  );
}

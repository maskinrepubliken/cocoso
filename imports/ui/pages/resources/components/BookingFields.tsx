import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';
import UserRoundIcon from 'lucide-react/dist/esm/icons/user-round';

import { Input, Textarea } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import ContactFields, { emptyContact } from '/imports/ui/forms/ContactFields';
import { ContactDetails } from '/imports/ui/generic/ContactDetails';
import { hasContact, type Contact } from '/imports/api/_utils/contact';
import { call } from '/imports/api/_utils/shared';
import ChoiceChips, {
  type Choice,
} from '/imports/ui/pages/activities/form/ChoiceChips';
import PersonCard, {
  PersonAvatar,
  personName,
} from '/imports/ui/pages/activities/form/PersonCard';
import PickerPopover from '/imports/ui/pages/activities/form/PickerPopover';
import ToggleSwitch from '/imports/ui/pages/activities/form/ToggleSwitch';
import type {
  OrganizerDefaults,
  OrganizerOption,
} from '/imports/ui/pages/activities/form/OrganizerFields';

// How a bookable place is booked: through an organizer (their public
// contact details), details of its own, or a link.
export type BookingVia = 'organizer' | 'own' | 'link';

// What the form edits; bookingValue() turns it into what is saved.
export interface BookingState {
  isBookable: boolean;
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
  isBookable: Boolean(booking),
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
  if (!state.isBookable) {
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

const searchText = (o: OrganizerOption) =>
  [o.firstName, o.lastName, o.username].filter(Boolean).join(' ');

interface BookingFieldsProps {
  value: BookingState;
  onChange: (value: BookingState) => void;
}

// Whether the place can be booked and how: a switch, a few words about
// booking it, and who to turn to, chosen as on an event: an organizer or
// details of its own; or a link to where it is booked.
export default function BookingFields({ value, onChange }: BookingFieldsProps) {
  const [t] = useTranslation('resources');
  const [options, setOptions] = useState<OrganizerOption[]>([]);
  const [person, setPerson] = useState<OrganizerDefaults | null>(null);
  const [picking, setPicking] = useState(false);

  const set = (patch: Partial<BookingState>) =>
    onChange({ ...value, ...patch });

  useEffect(() => {
    call<OrganizerOption[]>('getOrganizerOptions', true)
      .then((list) => setOptions(list || []))
      .catch(() => setOptions([]));
  }, []);

  // The chosen organizer's public contact details, to show what the page
  // will show
  useEffect(() => {
    if (!value.contactUserId) {
      setPerson(null);
      return;
    }
    let cancelled = false;
    call<OrganizerDefaults>('getOrganizerDefaults', value.contactUserId)
      .then((defaults) => !cancelled && setPerson(defaults))
      .catch(() => !cancelled && setPerson(null));
    return () => {
      cancelled = true;
    };
  }, [value.contactUserId]);

  const picker = (
    <PickerPopover
      inline={!value.contactUserId}
      emptyText={t('form.booking.organizerEmpty')}
      getKey={(o) => o._id}
      getSearchText={searchText}
      items={options}
      placeholder={t('form.booking.organizerSearch')}
      renderItem={(o) => (
        <>
          <PersonAvatar person={o} size={32} />
          <span className="picker-row-text">
            <span className="picker-row-title">{personName(o)}</span>
            {(o.firstName || o.lastName) && (
              <span className="picker-row-detail">@{o.username}</span>
            )}
          </span>
        </>
      )}
      selectedKey={value.contactUserId}
      onClose={() => setPicking(false)}
      onPick={(o) => {
        set({ contactUserId: o._id });
        setPicking(false);
      }}
    />
  );

  const chosen = options.find((o) => o._id === value.contactUserId) || person;

  const choices: Choice<BookingVia>[] = [
    {
      value: 'organizer',
      label: t('form.booking.organizer'),
      icon: <UserRoundIcon aria-hidden />,
      content: value.contactUserId ? (
        <div className="picker-anchor">
          <PersonCard
            action={
              <button
                type="button"
                className="person-card-button"
                aria-expanded={picking}
                onClick={() => setPicking(!picking)}
              >
                {t('form.booking.organizerChange')}
              </button>
            }
            person={chosen}
          />
          {picking && picker}
          {person &&
            (hasContact(person.publicContact) ? (
              <ContactDetails contact={person.publicContact} />
            ) : (
              <p className="form-preview-note">
                {t('form.booking.organizerNoContact')}
              </p>
            ))}
        </div>
      ) : (
        picker
      ),
    },
    {
      value: 'own',
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
      value: 'link',
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

  return (
    <>
      <ToggleSwitch
        checked={value.isBookable}
        helper={t('form.booking.switchHelper')}
        label={t('form.booking.switch')}
        onChange={(isBookable) => set({ isBookable })}
      />
      {value.isBookable && (
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
            value={value.via}
            onChange={(via) => set({ via })}
          />
        </>
      )}
    </>
  );
}

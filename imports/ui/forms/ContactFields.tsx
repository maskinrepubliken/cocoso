import React from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '/imports/ui/core';
import { styled } from '/stitches.config';
import { Contact } from '/imports/api/_utils/contact';

import FormField from './FormField';

export const emptyContact: Contact = {
  name: '',
  email: '',
  phone: '',
  website: '',
};

const Grid = styled('div', {
  display: 'grid',
  gap: '0 1rem',
  gridTemplateColumns: '1fr',
  '@media (min-width: 560px)': {
    gridTemplateColumns: '1fr 1fr',
  },
});

interface ContactFieldsProps {
  value?: Contact | null;
  onChange: (contact: Contact) => void;
  // Ask for a contact person or function (resources, groups, events).
  withName?: boolean;
}

// Name, email, phone and website as one controlled value. Whether an email
// or a phone is required is checked on the server
// (imports/api/_utils/contact.ts); the form says so in its helper text.
export default function ContactFields({
  value,
  onChange,
  withName = true,
}: ContactFieldsProps) {
  const [tc] = useTranslation('common');
  const contact = value || emptyContact;

  const set = (field: keyof Contact, fieldValue: string) =>
    onChange({ ...contact, [field]: fieldValue });

  return (
    <Grid>
      {withName && (
        <FormField
          css={{ gridColumn: '1 / -1' }}
          label={tc('contact.form.name.label')}
          my="2"
          optional
        >
          <Input
            placeholder={tc('contact.form.name.holder')}
            value={contact.name || ''}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormField>
      )}
      <FormField label={tc('contact.form.email')} my="2">
        <Input
          autoComplete="email"
          placeholder="namn@exempel.se"
          type="email"
          value={contact.email || ''}
          onChange={(e) => set('email', e.target.value)}
        />
      </FormField>
      <FormField label={tc('contact.form.phone')} my="2">
        <Input
          autoComplete="tel"
          placeholder="0325-57 60 00"
          type="tel"
          value={contact.phone || ''}
          onChange={(e) => set('phone', e.target.value)}
        />
      </FormField>
      <FormField
        css={{ gridColumn: '1 / -1' }}
        label={tc('contact.form.website')}
        my="2"
        optional
      >
        <Input
          autoComplete="url"
          placeholder="https://"
          type="url"
          value={contact.website || ''}
          onChange={(e) => set('website', e.target.value)}
        />
      </FormField>
    </Grid>
  );
}

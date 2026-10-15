import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input, Text } from '/imports/ui/core';
import { styled } from '/stitches.config';
import {
  Address,
  formatCoordinates,
  parseCoordinates,
} from '/imports/api/_utils/address';

import FormField from './FormField';

export const emptyAddress: Partial<Address> = {
  street: '',
  postalCode: '',
  city: '',
};

const Row = styled('div', {
  display: 'grid',
  gap: '0 1rem',
  gridTemplateColumns: '1fr',
  '@media (min-width: 560px)': {
    gridTemplateColumns: '9rem 1fr',
  },
});

interface AddressFieldsProps {
  value?: Partial<Address> | null;
  onChange: (address: Partial<Address>) => void;
  // A town and a street or coordinates must be given.
  required?: boolean;
}

// Street, postal code, town and an optional map point, as one controlled
// value. The server cleans and validates it (imports/api/_utils/address.ts).
export default function AddressFields({
  value,
  onChange,
  required = false,
}: AddressFieldsProps) {
  const [tc] = useTranslation('common');
  const address = value || emptyAddress;
  const [coordinatesText, setCoordinatesText] = useState(
    formatCoordinates(address.coordinates)
  );
  const coordinatesInvalid =
    coordinatesText.trim() !== '' && !parseCoordinates(coordinatesText);

  const set = (field: keyof Address, fieldValue: unknown) =>
    onChange({ ...address, [field]: fieldValue });

  const handleCoordinates = (text: string) => {
    setCoordinatesText(text);
    const coordinates = parseCoordinates(text);
    if (coordinates || text.trim() === '') {
      const { coordinates: _old, ...rest } = address;
      onChange(coordinates ? { ...rest, coordinates } : rest);
    }
  };

  return (
    <div>
      <FormField
        helper={tc('address.form.street.helper')}
        label={tc('address.form.street.label')}
        my="2"
      >
        <Input
          autoComplete="street-address"
          placeholder={tc('address.form.street.holder')}
          value={address.street || ''}
          onChange={(e) => set('street', e.target.value)}
        />
      </FormField>
      <Row>
        <FormField label={tc('address.form.postalCode.label')} my="2">
          <Input
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="514 33"
            value={address.postalCode || ''}
            onChange={(e) => set('postalCode', e.target.value)}
          />
        </FormField>
        <FormField
          label={tc('address.form.city.label')}
          my="2"
          required={required}
        >
          <Input
            autoComplete="address-level2"
            placeholder="Tranemo"
            required={required}
            value={address.city || ''}
            onChange={(e) => set('city', e.target.value)}
          />
        </FormField>
      </Row>
      <FormField
        helper={tc('address.form.coordinates.helper')}
        label={tc('address.form.coordinates.label')}
        my="2"
      >
        <Input
          invalid={coordinatesInvalid}
          placeholder="57.485668, 13.351021"
          value={coordinatesText}
          onChange={(e) => handleCoordinates(e.target.value)}
        />
      </FormField>
      {coordinatesInvalid && (
        <Text color="red.600" fontSize="sm">
          {tc('address.form.coordinates.invalid')}
        </Text>
      )}
    </div>
  );
}

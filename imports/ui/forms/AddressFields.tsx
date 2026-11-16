import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input, Text } from '/imports/ui/core';
import { styled } from '/stitches.config';
import {
  Address,
  formatCoordinates,
  parseCoordinates,
} from '/imports/api/_utils/address';

import PlaceMap from '/imports/ui/generic/PlaceMap';

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
  // Which way the place is given: a street address (coordinates are then
  // looked up from it), a map point, or both fields at once.
  mode?: 'street' | 'coordinates' | 'both';
}

// Street, postal code, town and an optional map point, as one controlled
// value. The server cleans and validates it (imports/api/_utils/address.ts).
export default function AddressFields({
  value,
  onChange,
  required = false,
  mode = 'both',
}: AddressFieldsProps) {
  const [tc] = useTranslation('common');
  const address = value || emptyAddress;
  const [coordinatesText, setCoordinatesText] = useState(
    formatCoordinates(address.coordinates)
  );
  const coordinatesInvalid =
    coordinatesText.trim() !== '' && !parseCoordinates(coordinatesText);

  // Given by street, a changed street, postal code or town is looked up
  // anew: the old map point goes.
  const set = (field: keyof Address, fieldValue: unknown) => {
    if (mode === 'street') {
      const { coordinates: _old, ...rest } = address;
      onChange({ ...rest, [field]: fieldValue });
      return;
    }
    onChange({ ...address, [field]: fieldValue });
  };
  const withStreet = mode !== 'coordinates';
  const withCoordinates = mode !== 'street';

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
      {withStreet && (
        <FormField
          helper={tc('address.form.street.helper')}
          label={tc('address.form.street.label')}
          my="2"
          required={mode === 'street' && required}
        >
          <Input
            autoComplete="street-address"
            placeholder={tc('address.form.street.holder')}
            required={mode === 'street' && required}
            value={address.street || ''}
            onChange={(e) => set('street', e.target.value)}
          />
        </FormField>
      )}
      <Row css={withStreet ? undefined : { gridTemplateColumns: '1fr' }}>
        {withStreet && (
          <FormField
            label={tc('address.form.postalCode.label')}
            my="2"
            optional
          >
            <Input
              autoComplete="postal-code"
              inputMode="numeric"
              placeholder="514 33"
              value={address.postalCode || ''}
              onChange={(e) => set('postalCode', e.target.value)}
            />
          </FormField>
        )}
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
      {withCoordinates && (
        <FormField
          helper={tc('address.form.coordinates.helper')}
          label={tc('address.form.coordinates.label')}
          my="2"
          optional={mode === 'both'}
          required={mode === 'coordinates' && required}
        >
          <Input
            invalid={coordinatesInvalid}
            placeholder="57.485668, 13.351021"
            required={mode === 'coordinates' && required}
            value={coordinatesText}
            onChange={(e) => handleCoordinates(e.target.value)}
          />
        </FormField>
      )}
      {withCoordinates && coordinatesInvalid && (
        <Text color="red.600" fontSize="sm">
          {tc('address.form.coordinates.invalid')}
        </Text>
      )}
      {address.coordinates && (
        <PlaceMap coordinates={address.coordinates} height={180} />
      )}
    </div>
  );
}

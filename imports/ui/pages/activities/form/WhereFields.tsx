import React from 'react';
import { useTranslation } from 'react-i18next';
import AutoCompleteSelect from 'react-select';
import makeAnimated from 'react-select/animated';

import { Input } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import AddressFields from '/imports/ui/forms/AddressFields';
import LocationSelect, {
  type LocationChoice,
} from '/imports/ui/forms/LocationSelect';
import AddressBlock from '/imports/ui/generic/AddressBlock';
import { useLocationName } from '/imports/ui/utils/useLocation';
import type { Address } from '/imports/api/_utils/address';
import type { SelectedResource } from '/imports/ui/types';

import ChoiceSwitch from './ChoiceSwitch';

const animatedComponents = makeAnimated();

// Where the event is: at one of the municipality's places, at the
// organizer's address from their profile, or at an address of its own.
export type WhereMode = 'place' | 'organizer' | 'own';

interface ResourceOption extends SelectedResource {
  address?: Address | null;
  locationId?: string | null;
}

interface WhereFieldsProps {
  mode: WhereMode;
  resources: ResourceOption[];
  selectedResource: SelectedResource | null;
  organizerAddress: Address | null;
  organizerLocationId: string | null;
  address: Partial<Address>;
  placeName: string;
  locationId: string | null;
  isMunicipalityOnly: boolean;
  profileLink: string;
  onModeChange: (mode: WhereMode) => void;
  onSelectResource: (resource: SelectedResource | null) => void;
  onAddressChange: (address: Partial<Address>) => void;
  onPlaceNameChange: (name: string) => void;
  onLocationChange: (choice: LocationChoice) => void;
}

export default function WhereFields({
  mode,
  resources,
  selectedResource,
  organizerAddress,
  organizerLocationId,
  address,
  placeName,
  locationId,
  isMunicipalityOnly,
  profileLink,
  onModeChange,
  onSelectResource,
  onAddressChange,
  onPlaceNameChange,
  onLocationChange,
}: WhereFieldsProps) {
  const [t] = useTranslation('activities');
  const [tc] = useTranslation('common');

  const resourceFull = resources.find((r) => r._id === selectedResource?._id);
  const resourceLocationName = useLocationName(resourceFull?.locationId);
  const organizerLocationName = useLocationName(organizerLocationId);

  // The ort follows from where the event is; only an address of its own
  // asks for it.
  const ortLine = (name: string | null) => (
    <p className="form-preview-note">
      {tc('locations.form.label')}:{' '}
      <strong>{name || tc('locations.wholeMunicipality')}</strong>
    </p>
  );

  return (
    <FormField
      helper={t('form.where.helper')}
      label={t('form.where.label')}
      my="6"
    >
      <ChoiceSwitch
        choices={[
          { value: 'place', label: t('form.where.place') },
          {
            value: 'organizer',
            label: t('form.where.organizer'),
            disabled: !organizerAddress,
          },
          { value: 'own', label: t('form.where.own') },
        ]}
        label={t('form.where.label')}
        value={mode}
        onChange={onModeChange}
      />
      {!organizerAddress && (
        <p className="form-preview-note">
          {t('form.where.organizerNone')}{' '}
          <a href={profileLink} rel="noreferrer" target="_blank">
            {t('form.editProfile')}
          </a>
        </p>
      )}

      {mode === 'place' && (
        <div className="form-preview">
          <AutoCompleteSelect
            isClearable
            components={animatedComponents}
            options={resources}
            placeholder={t('form.resource.holder')}
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: 'var(--cocoso-radius-falt)',
              }),
              option: (styles, { data }) => ({
                ...styles,
                fontWeight: data.isCombo ? 'bold' : 'normal',
              }),
            }}
            value={selectedResource}
            getOptionValue={(option) => option._id}
            onChange={(value) =>
              onSelectResource((value as SelectedResource | null) || null)
            }
          />
          {resourceFull?.address && (
            <AddressBlock
              withoutMapLink
              address={resourceFull.address}
              label={resourceFull.label}
              mapHeight={160}
            />
          )}
          {selectedResource && ortLine(resourceLocationName)}
        </div>
      )}

      {mode === 'organizer' && organizerAddress && (
        <div className="form-preview">
          <AddressBlock
            withoutMapLink
            address={organizerAddress}
            mapHeight={160}
          />
          {ortLine(organizerLocationName)}
          <p className="form-preview-note">
            {t('form.where.organizerHelper')}{' '}
            <a href={profileLink} rel="noreferrer" target="_blank">
              {t('form.editProfile')}
            </a>
          </p>
        </div>
      )}

      {mode === 'own' && (
        <div className="form-preview">
          <FormField label={t('form.place.label')}>
            <Input
              placeholder={t('form.place.holder')}
              value={placeName}
              onChange={(event) => onPlaceNameChange(event.target.value)}
            />
          </FormField>
          <AddressFields value={address} onChange={onAddressChange} />
          <FormField label={tc('locations.form.label')}>
            <LocationSelect
              allowMunicipalityOnly
              isMunicipalityOnly={isMunicipalityOnly}
              value={locationId}
              onChange={onLocationChange}
            />
          </FormField>
        </div>
      )}
    </FormField>
  );
}

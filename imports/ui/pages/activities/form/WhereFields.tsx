import React from 'react';
import { useTranslation } from 'react-i18next';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import HouseIcon from 'lucide-react/dist/esm/icons/house';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';

import { Input } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import AddressFields from '/imports/ui/forms/AddressFields';
import LocationSelect, {
  type LocationChoice,
} from '/imports/ui/forms/LocationSelect';
import AddressBlock from '/imports/ui/generic/AddressBlock';
import { useLocationName } from '/imports/ui/utils/useLocation';
import { type Address } from '/imports/api/_utils/address';
import type { SelectedResource } from '/imports/ui/types';

import ChoiceChips from './ChoiceChips';
import PlacePicker, { type PlaceOption } from './PlacePicker';

// Where the event is: at one of the municipality's places, at the
// organizer's address from their profile, or at an address of its own.
export type WhereMode = 'place' | 'organizer' | 'own';

type ResourceOption = PlaceOption;

interface WhereFieldsProps {
  mode: WhereMode;
  resources: ResourceOption[];
  selectedResource: SelectedResource | null;
  organizerAddress: Address | null;
  organizerLocationId: string | null;
  address: Partial<Address>;
  placeName: string;
  locationId: string | null;
  // Whether a place in the municipality was chosen for an address of its
  // own; one must be.
  locationPicked: boolean;
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
  locationPicked,
  onModeChange,
  onSelectResource,
  onAddressChange,
  onPlaceNameChange,
  onLocationChange,
}: WhereFieldsProps) {
  const [t] = useTranslation('activities');

  const resourceFull = resources.find((r) => r._id === selectedResource?._id);
  const resourceLocationName = useLocationName(resourceFull?.locationId);
  const organizerLocationName = useLocationName(organizerLocationId);

  // The ort follows from where the event is; only an address of its own
  // asks for it.
  const ortLine = (name: string | null) => (
    <p className="form-preview-note">
      {t('form.where.location')}:{' '}
      <strong>{name || t('form.where.locationOther')}</strong>
    </p>
  );

  return (
    <div className="where-fields">
      <ChoiceChips
        label={t('form.cards.place')}
        value={mode}
        onChange={onModeChange}
        choices={[
          {
            value: 'place',
            label: t('form.where.place'),
            icon: <MapPinIcon aria-hidden />,
            content: (
              <PlacePicker
                places={resources}
                selectedId={selectedResource?._id}
                onPick={(place) =>
                  onSelectResource({
                    _id: place._id,
                    label: place.label,
                  })
                }
              >
                {resourceFull?.address && (
                  <AddressBlock
                    withoutMapLink
                    address={resourceFull.address}
                    mapHeight={120}
                  />
                )}
                {ortLine(resourceLocationName)}
              </PlacePicker>
            ),
          },
          {
            value: 'organizer',
            label: t('form.where.organizer'),
            icon: <HouseIcon aria-hidden />,
            description: organizerAddress
              ? t('form.where.organizerHelper')
              : t('form.where.organizerNone'),
            disabled: !organizerAddress,
            content: organizerAddress ? (
              <>
                <AddressBlock
                  withoutMapLink
                  address={organizerAddress}
                  mapHeight={120}
                />
                {ortLine(organizerLocationName)}
              </>
            ) : null,
          },
          {
            value: 'own',
            label: t('form.where.own'),
            icon: <PencilLineIcon aria-hidden />,
            description: t('form.where.ownHelper'),
            content: (
              <>
                {/* Where in the municipality first: it is the one must */}
                <FormField label={t('form.where.location')}>
                  <LocationSelect
                    unchosenLabel={
                      locationPicked ? undefined : t('form.where.locationPick')
                    }
                    value={locationId}
                    wholeLabel={t('form.where.locationOther')}
                    onChange={onLocationChange}
                  />
                </FormField>
                <FormField label={t('form.where.placeName')} optional>
                  <Input
                    placeholder={t('form.place.holder')}
                    value={placeName}
                    onChange={(event) => onPlaceNameChange(event.target.value)}
                  />
                </FormField>
                <AddressFields value={address} onChange={onAddressChange} />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

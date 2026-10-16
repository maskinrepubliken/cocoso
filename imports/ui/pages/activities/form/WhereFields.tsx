import React, { useState } from 'react';
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
import { formatAddress, type Address } from '/imports/api/_utils/address';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import type { SelectedResource } from '/imports/ui/types';

import ChoiceChips from './ChoiceChips';
import PickerPopover from './PickerPopover';

// Where the event is: at one of the municipality's places, at the
// organizer's address from their profile, or at an address of its own.
export type WhereMode = 'place' | 'organizer' | 'own';

interface ResourceOption extends SelectedResource {
  address?: Address | null;
  locationId?: string | null;
  images?: string[];
  imageUrl?: string;
}

// A place's picture, or a pin on green when it has none
function PlaceThumb({
  place,
  size = 44,
}: {
  place?: ResourceOption;
  size?: number;
}) {
  const image = place?.images?.[0] || place?.imageUrl;
  const src = image ? getImageUrl(image, 'thumb') || image : null;
  return (
    <span
      aria-hidden
      className={`place-thumb ${src ? '' : 'is-empty'}`}
      style={{ width: size, height: size }}
    >
      {src ? <img alt="" src={src} /> : <MapPinIcon width={18} height={18} />}
    </span>
  );
}

function PlaceRow({ place }: { place: ResourceOption }) {
  const where = formatAddress(place.address);
  return (
    <>
      <PlaceThumb place={place} size={36} />
      <span className="picker-row-text">
        <span className="picker-row-title">{place.label}</span>
        {where && <span className="picker-row-detail">{where}</span>}
      </span>
    </>
  );
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
  const [picking, setPicking] = useState(false);

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
            content:
              resourceFull && !picking ? (
                <>
                  <div className="place-card">
                    <PlaceThumb place={resourceFull} />
                    <span className="person-card-text">
                      <span className="person-card-name">
                        {resourceFull.label}
                      </span>
                      {formatAddress(resourceFull.address) && (
                        <span className="person-card-note">
                          {formatAddress(resourceFull.address)}
                        </span>
                      )}
                    </span>
                    <span className="person-card-action">
                      <button
                        type="button"
                        className="person-card-button"
                        onClick={() => setPicking(true)}
                      >
                        {t('form.where.change')}
                      </button>
                    </span>
                  </div>
                  {resourceFull.address && (
                    <AddressBlock
                      withoutMapLink
                      address={resourceFull.address}
                      mapHeight={120}
                    />
                  )}
                  {ortLine(resourceLocationName)}
                </>
              ) : (
                // The places right here, to search and scroll; no dropdown
                <PickerPopover
                  inline
                  autoFocus={picking}
                  emptyText={t('form.where.empty')}
                  getKey={(place) => place._id}
                  getSearchText={(place) =>
                    [place.label, formatAddress(place.address)].join(' ')
                  }
                  items={resources}
                  placeholder={t('form.where.search')}
                  renderItem={(place) => <PlaceRow place={place} />}
                  selectedKey={selectedResource?._id}
                  onClose={() => setPicking(false)}
                  onPick={(place) => {
                    onSelectResource({
                      _id: place._id,
                      label: place.label,
                      isCombo: place.isCombo,
                      isBookable: place.isBookable,
                    });
                    setPicking(false);
                  }}
                />
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

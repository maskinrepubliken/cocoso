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
  isMunicipalityOnly: boolean;
  profileLink: string | null;
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
  const [picking, setPicking] = useState(false);

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
            description: t('form.where.placeHelper'),
            content: (
              <>
                <div className="picker-anchor">
                  {resourceFull ? (
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
                          aria-expanded={picking}
                          onClick={() => setPicking(!picking)}
                        >
                          {t('form.where.change')}
                        </button>
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="person-add"
                      aria-expanded={picking}
                      onClick={() => setPicking(!picking)}
                    >
                      <MapPinIcon aria-hidden width={16} height={16} />
                      {t('form.where.pick')}
                    </button>
                  )}
                  {picking && (
                    <PickerPopover
                      emptyText={t('form.where.empty')}
                      getKey={(place) => place._id}
                      getSearchText={(place) =>
                        [place.label, formatAddress(place.address)].join(' ')
                      }
                      items={resources}
                      placeholder={t('form.where.search')}
                      renderItem={(place) => <PlaceRow place={place} />}
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
                  )}
                </div>
                {resourceFull?.address && (
                  <AddressBlock
                    withoutMapLink
                    address={resourceFull.address}
                    mapHeight={120}
                  />
                )}
                {selectedResource && ortLine(resourceLocationName)}
              </>
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
                {profileLink && (
                  <a
                    className="form-preview-link"
                    href={profileLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {t('form.editProfile')}
                  </a>
                )}
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
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

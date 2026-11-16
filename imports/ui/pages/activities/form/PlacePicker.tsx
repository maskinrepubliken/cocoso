import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';

import { formatAddress, type Address } from '/imports/api/_utils/address';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

import PickerPopover from './PickerPopover';

export interface PlaceOption {
  _id: string;
  label: string;
  address?: Address | null;
  locationId?: string | null;
  images?: string[];
  imageUrl?: string;
  isCombo?: boolean;
  isBookable?: boolean;
}

// A place's picture, or a pin on green when it has none
function PlaceThumb({
  place,
  size = 44,
}: {
  place?: PlaceOption;
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

function PlaceRow({ place }: { place: PlaceOption }) {
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

interface PlacePickerProps {
  places: PlaceOption[];
  // The place chosen, if any: shown as a card with "Byt"
  selectedId?: string | null;
  onPick: (place: PlaceOption) => void;
  // Under the chosen place's card, e.g. its map
  children?: React.ReactNode;
}

// One of the municipality's places: the chosen one as a card with its
// picture and address, or the places right here, to search and scroll.
// Used where an event is held and for the place a place is part of.
export default function PlacePicker({
  places,
  selectedId,
  onPick,
  children,
}: PlacePickerProps) {
  const [t] = useTranslation('activities');
  const [picking, setPicking] = useState(false);
  const selected = places.find((place) => place._id === selectedId);

  if (selected && !picking) {
    return (
      <>
        <div className="place-card">
          <PlaceThumb place={selected} />
          <span className="person-card-text">
            <span className="person-card-name">{selected.label}</span>
            {formatAddress(selected.address) && (
              <span className="person-card-note">
                {formatAddress(selected.address)}
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
        {children}
      </>
    );
  }

  return (
    <PickerPopover
      inline
      autoFocus={picking}
      emptyText={t('form.where.empty')}
      getKey={(place) => place._id}
      getSearchText={(place) =>
        [place.label, formatAddress(place.address)].join(' ')
      }
      items={places}
      placeholder={t('form.where.search')}
      renderItem={(place) => <PlaceRow place={place} />}
      selectedKey={selectedId || undefined}
      onClose={() => setPicking(false)}
      onPick={(place) => {
        onPick(place);
        setPicking(false);
      }}
    />
  );
}

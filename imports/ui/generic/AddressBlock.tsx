import React from 'react';

import { styled } from '/stitches.config';
import { hasAddress, type Address } from '/imports/api/_utils/address';
import { hasContact, type Contact } from '/imports/api/_utils/contact';

import { AddressDetails, ContactDetails } from './ContactDetails';
import PlaceMap from './PlaceMap';

// Where something is, the same everywhere an address is shown: the map when
// the address has coordinates, the address as on an envelope with a link to
// a bigger map, and contact details when there are any.
//
//   stacked  map on top, text below; for narrow columns (the event page).
//   split    map beside the text from 700px up, stacked below that; for
//            full-width sections (the place page).

const SPLIT = '@media (min-width: 700px)';
const NARROW = '@media (max-width: 699px)';

// On a narrow screen the map can reach the edges of the panel it is in,
// like the picture on top of an entry card. The offsets match the padding
// of Panel (entry pages) and Section (the event page).
const MapEdge = styled('div', {
  variants: {
    edge: {
      top: {
        [NARROW]: {
          margin: '-1.25rem -1.5rem 0',
          '& > div': { borderRadius: '16px 16px 0 0' },
        },
      },
      sides: {
        [NARROW]: {
          margin: '0 -1.5rem',
          '& > div': { borderRadius: 0 },
        },
      },
      none: {},
    },
  },
});

const Root = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'minmax(0, 1fr)',
  variants: {
    split: {
      true: {
        [SPLIT]: {
          alignItems: 'start',
          columnGap: '1.75rem',
          gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
        },
      },
    },
  },
});

const Details = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

interface AddressBlockProps {
  address?: Partial<Address> | null;
  contact?: Contact | null;
  layout?: 'stacked' | 'split';
  // Read out instead of the map, e.g. the place's name.
  label?: string;
  mapHeight?: number;
  // Let the map reach the panel's edges on narrow screens.
  edge?: 'top' | 'sides' | 'none';
  withoutMapLink?: boolean;
}

export default function AddressBlock({
  address,
  contact,
  layout = 'stacked',
  label,
  mapHeight,
  edge = 'none',
  withoutMapLink,
}: AddressBlockProps) {
  const withAddress = hasAddress(address);
  const withContact = hasContact(contact);
  if (!withAddress && !withContact) {
    return null;
  }
  const coordinates = address?.coordinates;
  const split = layout === 'split' && Boolean(coordinates);

  return (
    <Root split={split}>
      {coordinates && (
        <MapEdge edge={edge}>
          <PlaceMap
            coordinates={coordinates}
            height={mapHeight || (split ? 280 : 220)}
            label={label}
          />
        </MapEdge>
      )}
      <Details>
        {withAddress && (
          <AddressDetails address={address} withoutMapLink={withoutMapLink} />
        )}
        {withContact && <ContactDetails contact={contact} />}
      </Details>
    </Root>
  );
}

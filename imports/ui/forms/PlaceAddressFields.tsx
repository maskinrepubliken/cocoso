import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LoaderIcon from 'lucide-react/dist/esm/icons/loader-circle';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';

import { Input, Text } from '/imports/ui/core';
import { styled } from '/stitches.config';
import {
  type Address,
  type Coordinates,
  formatCoordinates,
  parseCoordinates,
} from '/imports/api/_utils/address';
import { call } from '/imports/api/_utils/shared';
import MapPicker from '/imports/ui/generic/MapPicker';

import FormField from './FormField';

const Row = styled('div', {
  display: 'grid',
  gap: '0 1rem',
  gridTemplateColumns: '1fr',
  '@media (min-width: 560px)': {
    gridTemplateColumns: '9rem 1fr',
  },
});

// Fields being filled in from elsewhere: faded, and not to be typed in
const Filling = styled('div', {
  transition: 'opacity 0.2s ease',
  variants: {
    busy: {
      true: { opacity: 0.55, pointerEvents: 'none' },
    },
  },
});

// "Hämtar adressen …" with a turning circle, under what is being filled
// The map's address at the pin, offered instead of the one written
const Suggestion = styled('div', {
  backgroundColor: 'var(--cocoso-colors-theme-50, #f3f7ee)',
  border: '1px solid var(--cocoso-linje)',
  borderRadius: '12px',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '14px',
  margin: '0 0 0.75rem',
  padding: '10px 12px',
  '& p': { margin: '0 0 8px' },
  '& strong': { display: 'block', marginTop: '2px' },
  '& .actions': { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  '& button': {
    backgroundColor: 'var(--cocoso-papper)',
    border: '1px solid var(--cocoso-linje)',
    borderRadius: '999px',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '13px',
    fontWeight: 700,
    padding: '4px 12px',
  },
  '& button.use': {
    backgroundColor: 'var(--cocoso-colors-theme-700)',
    borderColor: 'var(--cocoso-colors-theme-700)',
    color: 'white',
  },
});

const Busy = styled('p', {
  alignItems: 'center',
  color: 'var(--cocoso-mylla-soft)',
  display: 'flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '13px',
  fontWeight: 600,
  gap: '6px',
  margin: '0 0 0.5rem',
  '& svg': {
    animation: 'spin 1s linear infinite',
    flex: 'none',
    height: '15px',
    width: '15px',
  },
});

type Status =
  | 'idle'
  // the point of what was typed is looked up, then not found
  | 'findingPoint'
  | 'pointNotFound'
  // the address of the point on the map is looked up, then not found
  | 'findingAddress'
  | 'addressNotFound'
  // only the street was found, not the house
  | 'pointApprox'
  // the map has another address at the pin than the one written
  | 'suggestAddress';

interface FoundAddress {
  street: string;
  postalCode: string;
  city: string;
}

const sameText = (a?: string, b?: string) =>
  (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

const WAIT_MS = 900;

const samePoint = (a?: Coordinates | null, b?: Coordinates | null) =>
  Boolean(a && b && a.lat === b.lat && a.lng === b.lng);

interface PlaceAddressFieldsProps {
  value?: Partial<Address> | null;
  onChange: (address: Partial<Address>) => void;
}

// Where a place is, as street, postal code, town, coordinates and a pin on
// a map, kept in step whichever is changed. A typed address is looked up,
// a moment after the typing stops, and its coordinates and the pin follow.
// A pin put or dragged on the map, or coordinates typed, are looked up the
// other way, and the address follows, unless it was written by hand (or
// saved): then the map's address is only offered, to take or leave. What is being looked up says so, on
// the map and under the fields being filled; what cannot be found says
// that too, and the rest stays as it was to be filled in by hand.
export default function PlaceAddressFields({
  value,
  onChange,
}: PlaceAddressFieldsProps) {
  const [tc] = useTranslation('common');
  const address = value || {};
  const latest = useRef(address);
  latest.current = address;
  const [status, setStatus] = useState<Status>('idle');
  // Where the map looks when a typed address was not found: its town
  const [town, setTown] = useState<Coordinates | null>(null);
  // The point whose address is to be looked up, once given on the map or
  // typed
  const [reverseOf, setReverseOf] = useState<Coordinates | null>(null);
  // Whether the address came from the map (and so may follow it), and
  // whether the lookup under way fills it in or only offers
  const fromMap = useRef(!(address.street || '').trim());
  const fillOnFound = useRef(true);
  const [suggestion, setSuggestion] = useState<FoundAddress | null>(null);

  const [coordinatesText, setCoordinatesText] = useState(
    formatCoordinates(address.coordinates)
  );
  const coordinatesInvalid =
    coordinatesText.trim() !== '' && !parseCoordinates(coordinatesText);
  // A point that came from elsewhere (the address found, a pin) shows in
  // the field, unless that is what is being typed
  useEffect(() => {
    if (!samePoint(parseCoordinates(coordinatesText), address.coordinates)) {
      setCoordinatesText(formatCoordinates(address.coordinates));
    }
  }, [address.coordinates?.lat, address.coordinates?.lng]);

  // Typing the address: the old point goes, to be looked up anew
  const setField = (field: 'street' | 'postalCode' | 'city', text: string) => {
    const { coordinates: _old, ...rest } = address;
    fromMap.current = false;
    setReverseOf(null);
    setSuggestion(null);
    setStatus('idle');
    onChange({ ...rest, [field]: text });
  };

  // A point given on the map or typed: it stands, and its address is
  // looked up
  const setPoint = (coordinates: Coordinates) => {
    fillOnFound.current =
      fromMap.current || !(latest.current.street || '').trim();
    setSuggestion(null);
    onChange({ ...latest.current, coordinates });
    setReverseOf(coordinates);
  };

  const handleCoordinates = (text: string) => {
    setCoordinatesText(text);
    const coordinates = parseCoordinates(text);
    if (coordinates) {
      setPoint(coordinates);
    } else if (text.trim() === '') {
      const { coordinates: _old, ...rest } = address;
      setReverseOf(null);
      onChange(rest);
    }
  };

  // Address → point
  const street = (address.street || '').trim();
  const postalCode = (address.postalCode || '').trim();
  const city = (address.city || '').trim();
  const hasPoint = Boolean(address.coordinates);
  useEffect(() => {
    if (!street || !city || hasPoint) {
      if (
        status === 'findingPoint' ||
        status === 'pointNotFound' ||
        (status === 'pointApprox' && !hasPoint)
      ) {
        setStatus('idle');
      }
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setStatus('findingPoint');
      call<{
        point?: Coordinates;
        precision?: 'known' | 'house' | 'street';
        town?: Coordinates | null;
      }>('findAddressPoint', { street, postalCode, city })
        .then(({ point, precision, town: around }) => {
          const now = latest.current;
          // Only for the address still written, without a point since
          if (
            cancelled ||
            (now.street || '').trim() !== street ||
            (now.city || '').trim() !== city ||
            now.coordinates
          ) {
            return;
          }
          if (point) {
            // Only the street: the pin is near, to be dragged to the house
            setStatus(precision === 'street' ? 'pointApprox' : 'idle');
            onChange({ ...now, coordinates: point });
          } else {
            setTown(around || null);
            setStatus('pointNotFound');
          }
        })
        .catch(() => !cancelled && setStatus('idle'));
    }, WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [street, postalCode, city, hasPoint]);

  // Point → address
  useEffect(() => {
    if (!reverseOf) {
      return undefined;
    }
    let cancelled = false;
    setStatus('findingAddress');
    const timer = setTimeout(() => {
      call<FoundAddress | null>('findPointAddress', reverseOf)
        .then((found) => {
          const now = latest.current;
          // Only for the point still there
          if (cancelled || !samePoint(now.coordinates, reverseOf)) {
            return;
          }
          setReverseOf(null);
          if (!found) {
            setStatus(fillOnFound.current ? 'addressNotFound' : 'idle');
          } else if (fillOnFound.current) {
            fromMap.current = true;
            setStatus('idle');
            onChange({ ...now, ...found, coordinates: reverseOf });
          } else if (
            sameText(found.street, now.street) &&
            sameText(found.city, now.city)
          ) {
            setStatus('idle');
          } else {
            setSuggestion(found);
            setStatus('suggestAddress');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setReverseOf(null);
            setStatus('idle');
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reverseOf?.lat, reverseOf?.lng]);

  const findingAddress = status === 'findingAddress';
  // Fields faded only when they are about to be filled in
  const fillingAddress = findingAddress && fillOnFound.current;

  const useSuggestion = () => {
    if (suggestion) {
      fromMap.current = true;
      onChange({ ...latest.current, ...suggestion });
    }
    setSuggestion(null);
    setStatus('idle');
  };
  const keepAddress = () => {
    setSuggestion(null);
    setStatus('idle');
  };
  const findingPoint = status === 'findingPoint';

  const mapNote =
    findingPoint || findingAddress ? (
      <>
        <LoaderIcon
          aria-hidden
          style={{ animation: 'spin 1s linear infinite' }}
        />
        {tc(
          findingPoint
            ? 'address.form.map.searching'
            : 'address.form.map.findingAddress'
        )}
      </>
    ) : status === 'pointNotFound' ? (
      <>
        <MapPinIcon aria-hidden />
        {tc('address.form.map.notFound')}
      </>
    ) : status === 'pointApprox' ? (
      <>
        <MapPinIcon aria-hidden />
        {tc('address.form.map.approx')}
      </>
    ) : status === 'addressNotFound' ? (
      <>
        <MapPinIcon aria-hidden />
        {tc('address.form.map.noAddress')}
      </>
    ) : null;

  return (
    <div aria-busy={findingPoint || findingAddress}>
      <Filling busy={fillingAddress}>
        <FormField
          helper={tc('address.form.street.helper')}
          label={tc('address.form.street.label')}
          my="2"
        >
          <Input
            autoComplete="street-address"
            placeholder={tc('address.form.street.holder')}
            value={address.street || ''}
            onChange={(e) => setField('street', e.target.value)}
          />
        </FormField>
        <Row>
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
              onChange={(e) => setField('postalCode', e.target.value)}
            />
          </FormField>
          <FormField label={tc('address.form.city.label')} my="2">
            <Input
              autoComplete="address-level2"
              placeholder="Tranemo"
              value={address.city || ''}
              onChange={(e) => setField('city', e.target.value)}
            />
          </FormField>
        </Row>
      </Filling>
      {fillingAddress && (
        <Busy role="status">
          <LoaderIcon aria-hidden />
          {tc('address.form.map.findingAddress')}
        </Busy>
      )}
      {suggestion && (
        <Suggestion role="status">
          <p>
            {tc('address.form.suggest.text')}
            <strong>
              {[
                suggestion.street,
                [suggestion.postalCode, suggestion.city]
                  .filter(Boolean)
                  .join(' '),
              ]
                .filter(Boolean)
                .join(', ')}
            </strong>
          </p>
          <div className="actions">
            <button className="use" type="button" onClick={useSuggestion}>
              {tc('address.form.suggest.use')}
            </button>
            <button type="button" onClick={keepAddress}>
              {tc('address.form.suggest.keep')}
            </button>
          </div>
        </Suggestion>
      )}

      <Filling busy={findingPoint}>
        <FormField
          helper={tc('address.form.coordinates.helperLinked')}
          label={tc('address.form.coordinates.label')}
          my="2"
          optional
        >
          <Input
            invalid={coordinatesInvalid}
            placeholder="57.485668, 13.351021"
            value={coordinatesText}
            onChange={(e) => handleCoordinates(e.target.value)}
          />
        </FormField>
      </Filling>
      {coordinatesInvalid && (
        <Text color="red.600" fontSize="sm">
          {tc('address.form.coordinates.invalid')}
        </Text>
      )}
      {findingPoint && (
        <Busy role="status">
          <LoaderIcon aria-hidden />
          {tc('address.form.map.searching')}
        </Busy>
      )}

      <FormField
        helper={tc('address.form.map.helperLinked')}
        label={tc('address.form.map.label')}
        my="2"
      >
        <MapPicker
          focus={town}
          note={mapNote}
          noteTone={
            status === 'pointNotFound' ||
            status === 'addressNotFound' ||
            status === 'pointApprox'
              ? 'ask'
              : 'quiet'
          }
          value={address.coordinates}
          onChange={setPoint}
        />
      </FormField>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import type { Coordinates } from '/imports/api/_utils/address';
import loadMaplibre, { MAP_STYLE_URL } from '/imports/ui/utils/loadMaplibre';

// Tranemo kommun as a whole, where a place without a point starts
const MUNICIPALITY: Coordinates = { lat: 57.5, lng: 13.38 };

const Frame = styled('div', {
  backgroundColor: 'var(--cocoso-colors-theme-100)',
  borderRadius: '14px',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
  '& .maplibregl-canvas': { cursor: 'crosshair' },
  '& .maplibregl-ctrl-attrib': { fontSize: '10px' },
});

const Fallback = styled('div', {
  alignItems: 'center',
  color: 'var(--cocoso-mylla-soft)',
  display: 'flex',
  fontSize: '0.85rem',
  inset: 0,
  justifyContent: 'center',
  padding: '1rem',
  position: 'absolute',
  textAlign: 'center',
});

// A word on the map, at its top: what is going on, or what to do
const Note = styled('div', {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: '999px',
  boxShadow: 'var(--cocoso-skugga)',
  color: 'var(--cocoso-mylla)',
  display: 'flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '13px',
  fontWeight: 600,
  gap: '6px',
  left: '10px',
  lineHeight: 1.3,
  maxWidth: 'calc(100% - 60px)',
  padding: '6px 12px',
  pointerEvents: 'none',
  position: 'absolute',
  top: '10px',
  zIndex: 2,
  '& svg': { flex: 'none', height: '15px', width: '15px' },
  variants: {
    tone: {
      quiet: { color: 'var(--cocoso-mylla-soft)' },
      ask: { color: 'var(--cocoso-tegel)' },
    },
  },
});

const markerColour = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue('--cocoso-tegel')
    .trim() || '#b5532a';

// Rounded as the coordinates field shows them, about a metre
const round = (value: number) => Math.round(value * 1e6) / 1e6;

interface MapPickerProps {
  value?: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
  height?: number | string;
  // Where to look while there is no pin, e.g. the town of an address that
  // could not be found
  focus?: Coordinates | null;
  // A word shown on the map
  note?: React.ReactNode;
  noteTone?: 'quiet' | 'ask';
}

// A map to put a place's pin on: a click puts it there, and the pin can be
// dragged. Without a point yet it shows the whole municipality. A point
// typed elsewhere moves the pin. As on the place's page, scrolling the
// page over it does not zoom: two fingers or ctrl + scroll do.
export default function MapPicker({
  value,
  onChange,
  height = 280,
  focus,
  note,
  noteTone = 'quiet',
}: MapPickerProps) {
  const [tc] = useTranslation('common');
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const maplibre = useRef<any>(null);
  const changed = useRef(onChange);
  changed.current = onChange;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Puts the pin at a point, making it the first time
  const pin = (coordinates: Coordinates) => {
    if (!map.current || !maplibre.current) {
      return;
    }
    if (!marker.current) {
      marker.current = new maplibre.current.Marker({
        color: markerColour(),
        draggable: true,
      })
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map.current);
      marker.current.on('dragend', () => {
        const { lat, lng } = marker.current.getLngLat();
        changed.current({ lat: round(lat), lng: round(lng) });
      });
      return;
    }
    marker.current.setLngLat([coordinates.lng, coordinates.lat]);
  };

  useEffect(() => {
    let cancelled = false;
    loadMaplibre()
      .then((maplibregl) => {
        if (cancelled || !container.current) {
          return;
        }
        maplibre.current = maplibregl;
        const start = value || MUNICIPALITY;
        map.current = new maplibregl.Map({
          container: container.current,
          style: MAP_STYLE_URL,
          center: [start.lng, start.lat],
          zoom: value ? 15 : 9.5,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          locale: {
            'CooperativeGesturesHandler.WindowsHelpText': tc(
              'address.gestures.windows'
            ),
            'CooperativeGesturesHandler.MacHelpText': tc(
              'address.gestures.mac'
            ),
            'CooperativeGesturesHandler.MobileHelpText': tc(
              'address.gestures.mobile'
            ),
          },
        });
        map.current.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          'top-right'
        );
        map.current.on('click', (event: any) => {
          const coordinates = {
            lat: round(event.lngLat.lat),
            lng: round(event.lngLat.lng),
          };
          pin(coordinates);
          changed.current(coordinates);
        });
        map.current.once('load', () => {
          const attribution = container.current?.querySelector(
            '.maplibregl-ctrl-attrib'
          );
          attribution?.classList.remove('maplibregl-compact-show');
          attribution?.removeAttribute('open');
        });
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      marker.current = null;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // A point given or changed elsewhere (typed, or found from the street):
  // the pin goes there, and the map follows if it is out of sight or the
  // map is too far out
  useEffect(() => {
    if (!ready || !map.current) {
      return;
    }
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const current = marker.current?.getLngLat();
    if (current && current.lat === value.lat && current.lng === value.lng) {
      return;
    }
    pin(value);
    // Out of sight, or too far out to see where it is: closer
    if (
      !map.current.getBounds().contains([value.lng, value.lat]) ||
      map.current.getZoom() < 13
    ) {
      map.current.flyTo({ center: [value.lng, value.lat], zoom: 15 });
    }
  }, [ready, value?.lat, value?.lng]);

  // No pin but somewhere to look: the map goes there
  useEffect(() => {
    if (!ready || !map.current || value || !focus) {
      return;
    }
    map.current.flyTo({ center: [focus.lng, focus.lat], zoom: 13 });
  }, [ready, focus?.lat, focus?.lng]);

  return (
    <Frame
      aria-label={tc('address.form.map.label')}
      css={{ height }}
      ref={container}
    >
      {note && !failed && (
        <Note role="status" tone={noteTone}>
          {note}
        </Note>
      )}
      {failed && <Fallback>{tc('address.mapUnavailable')}</Fallback>}
    </Frame>
  );
}

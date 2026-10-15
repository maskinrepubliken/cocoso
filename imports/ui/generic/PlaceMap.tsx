import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import type { Coordinates } from '/imports/api/_utils/address';
import loadMaplibre, { MAP_STYLE_URL } from '/imports/ui/utils/loadMaplibre';

const Frame = styled('div', {
  backgroundColor: 'var(--cocoso-colors-theme-100)',
  borderRadius: '14px',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
  '& .maplibregl-ctrl-attrib': { fontSize: '10px' },
});

const Fallback = styled('div', {
  alignItems: 'center',
  color: 'var(--cocoso-mylla-soft)',
  display: 'flex',
  fontSize: '0.85rem',
  height: '100%',
  inset: 0,
  justifyContent: 'center',
  padding: '1rem',
  position: 'absolute',
  textAlign: 'center',
});

interface PlaceMapProps {
  coordinates: Coordinates;
  // Read by screen readers instead of the map.
  label?: string;
  height?: number | string;
  zoom?: number;
}

const markerColour = () => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--cocoso-tegel')
    .trim();
  return value || '#b5532a';
};

// A small map with a pin on one point. The server renders an empty frame of
// the same size; the map itself is drawn in the browser. Scrolling the page
// over it does not zoom: two fingers or ctrl + scroll do.
export default function PlaceMap({
  coordinates,
  label,
  height = 240,
  zoom = 15,
}: PlaceMapProps) {
  const [tc] = useTranslation('common');
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const { lat, lng } = coordinates;

  useEffect(() => {
    let map: any = null;
    let cancelled = false;
    loadMaplibre()
      .then((maplibregl) => {
        if (cancelled || !container.current) {
          return;
        }
        map = new maplibregl.Map({
          container: container.current,
          style: MAP_STYLE_URL,
          center: [lng, lat],
          zoom,
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
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          'top-right'
        );
        new maplibregl.Marker({ color: markerColour() })
          .setLngLat([lng, lat])
          .addTo(map);
        // The attribution starts folded into its (i) button; on a map this
        // small it would otherwise cover the bottom of it.
        map.once('load', () => {
          const attribution = container.current?.querySelector(
            '.maplibregl-ctrl-attrib'
          );
          attribution?.classList.remove('maplibregl-compact-show');
          attribution?.removeAttribute('open');
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
    };
  }, [lat, lng, zoom]);

  return (
    <Frame
      aria-label={label || tc('address.map')}
      css={{ height }}
      ref={container}
      role="img"
    >
      {failed && <Fallback>{tc('address.mapUnavailable')}</Fallback>}
    </Frame>
  );
}

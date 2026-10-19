import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CheckIcon from 'lucide-react/dist/esm/icons/check';

import ThreeDIcon from '../generic/ThreeDIcon';
import PlaceTag from '../generic/PlaceTag';
import { worldForLocation } from '/imports/ui/utils/locationPalette';

// How the events page is narrowed besides the kind: past or upcoming, a
// stretch of days, and only those one signs up for. Kept in the address
// (showPast, when) so a view can be linked and Back undoes it.
export type EventWhen = '' | 'today' | 'weekend' | 'week';

export interface EventView {
  showPast: boolean;
  when: EventWhen;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The days a choice covers, from and to inclusive, counted from today
export const whenRange = (when: EventWhen, now = new Date()) => {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from);
  if (when === 'weekend') {
    // Saturday and Sunday ahead; on a weekend, from today to Sunday
    const day = from.getDay();
    if (day !== 6 && day !== 0) {
      from.setDate(from.getDate() + (6 - day));
    }
    to.setTime(from.getTime());
    to.setDate(from.getDate() + (from.getDay() === 6 ? 1 : 0));
  } else if (when === 'week') {
    to.setDate(from.getDate() + 6);
  }
  return { from: isoDay(from), to: isoDay(to) };
};

// Does any occasion of the event touch those days?
export const happensWithin = (activity: any, when: EventWhen) => {
  if (!when) {
    return true;
  }
  const { from, to } = whenRange(when);
  return (activity.datesAndTimes || []).some(
    (o: any) =>
      (o.startDate || '') <= to && (o.endDate || o.startDate || '') >= from
  );
};

interface EventViewMenuProps {
  view: EventView;
  // The kinds there are events of, and those chosen
  kinds: { key: string; icon: string }[];
  selectedKinds: string[];
  // The places (orter) and the slugs of those chosen
  locations: { _id: string; name: string; slug: string }[];
  places: string[];
  // Something narrows the list beyond what the page shows anyway
  isNarrowed: boolean;
  // Past or upcoming and the stretch of days; not in the calendar, where
  // one moves between days and weeks instead
  withTime?: boolean;
  onChange: (view: Partial<EventView>) => void;
  onToggleKind: (key: string) => void;
  onTogglePlace: (slug: string) => void;
}

// The toggle at the end of the kinds: a menu in the header's popup style
// with the ways to narrow the events; a dot on the button while any is on.
export default function EventViewMenu({
  view,
  kinds,
  selectedKinds,
  locations,
  places,
  isNarrowed,
  withTime = true,
  onChange,
  onToggleKind,
  onTogglePlace,
}: EventViewMenuProps) {
  const [tc] = useTranslation('common');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Escape or a tap elsewhere closes it, as the header's menus
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // A stretch of days: title and grey detail, no icon, a check when chosen
  const row = (key: string, isActive: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      role="menuitemradio"
      aria-checked={isActive}
      className={`site-menu-row view-menu-row ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="site-menu-row-text">
        <span className="site-menu-row-title">
          {tc(`eventView.${key}.title`)}
        </span>
        <span className="site-menu-row-detail">
          {tc(`eventView.${key}.detail`)}
        </span>
      </span>
      {isActive && <CheckIcon aria-hidden className="view-menu-check" />}
    </button>
  );

  // A small row with a check, two to a line: one kind (its icon and name)
  // or one place (its orttag, as in the place menu in the header)
  const check = (
    key: string,
    content: React.ReactNode,
    isChecked: boolean,
    onClick: () => void
  ) => (
    <button
      key={key}
      type="button"
      role="menuitemcheckbox"
      aria-checked={isChecked}
      className={`view-menu-check-row ${isChecked ? 'is-checked' : ''}`}
      onClick={onClick}
    >
      {content}
      <span aria-hidden className="view-menu-box">
        {isChecked && <CheckIcon />}
      </span>
    </button>
  );

  const sortedLocations = [...locations].sort((a, b) =>
    a.name.localeCompare(b.name, 'sv')
  );

  return (
    <div className="view-menu" ref={rootRef}>
      <button
        type="button"
        className={`kind-tile view-menu-button ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        <span className="view-menu-icon">
          <ThreeDIcon name="toggle" size={36} />
          {isNarrowed && <span className="view-menu-dot" aria-hidden />}
        </span>
        <span>{tc('eventView.button')}</span>
      </button>

      {open && (
        <div className="site-menu-panel view-menu-panel" role="menu">
          {/* Past or upcoming as the switch beside the heading was */}
          {withTime && (
            <div className="seg view-menu-seg" role="group">
              <button
                type="button"
                className={`seg-button ${view.showPast ? 'is-active' : ''}`}
                aria-pressed={view.showPast}
                onClick={() => onChange({ showPast: true, when: '' })}
              >
                {tc('labels.past')}
              </button>
              <button
                type="button"
                className={`seg-button ${view.showPast ? '' : 'is-active'}`}
                aria-pressed={!view.showPast}
                onClick={() => onChange({ showPast: false })}
              >
                {tc('labels.upcoming')}
              </button>
            </div>
          )}

          {kinds.length > 1 && (
            <>
              <p className="view-menu-heading">
                {tc('eventView.headings.kinds')}
              </p>
              <div className="view-menu-grid">
                {kinds.map((kind) =>
                  check(
                    kind.key,
                    <>
                      <ThreeDIcon name={kind.icon} size={24} />
                      <span className="view-menu-label">
                        {tc(`eventKinds.${kind.key}`)}
                      </span>
                    </>,
                    selectedKinds.includes(kind.key),
                    () => onToggleKind(kind.key)
                  )
                )}
              </div>
            </>
          )}

          {sortedLocations.length > 1 && (
            <>
              <p className="view-menu-heading">
                {tc('eventView.headings.places')}
              </p>
              <div className="view-menu-grid">
                {sortedLocations.map((location) =>
                  check(
                    location.slug,
                    <span className="view-menu-label">
                      <PlaceTag
                        className="bare"
                        name={location.name}
                        world={worldForLocation(locations, location._id)}
                      />
                    </span>,
                    places.includes(location.slug),
                    () => onTogglePlace(location.slug)
                  )
                )}
              </div>
            </>
          )}

          {withTime && !view.showPast && (
            <>
              <p className="view-menu-heading">
                {tc('eventView.headings.when')}
              </p>
              {row('anytime', !view.when, () => onChange({ when: '' }))}
              {row('today', view.when === 'today', () =>
                onChange({ when: 'today' })
              )}
              {row('weekend', view.when === 'weekend', () =>
                onChange({ when: 'weekend' })
              )}
              {row('week', view.when === 'week', () =>
                onChange({ when: 'week' })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CheckIcon from 'lucide-react/dist/esm/icons/check';

import ThreeDIcon from '../generic/ThreeDIcon';

// How the events page is narrowed besides the kind: past or upcoming, a
// stretch of days, and only those one signs up for. Kept in the address
// (showPast, when, rsvp) so a view can be linked and Back undoes it.
export type EventWhen = '' | 'today' | 'weekend' | 'week';

export interface EventView {
  showPast: boolean;
  when: EventWhen;
  rsvp: boolean;
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

  const row = (
    key: string,
    icon: string,
    isActive: boolean,
    onClick: () => void,
    disabled = false
  ) => (
    <button
      key={key}
      type="button"
      role="menuitemradio"
      aria-checked={isActive}
      className={`site-menu-row view-menu-row ${isActive ? 'is-active' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <ThreeDIcon name={icon} size={32} />
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

  // A small row with a check, two to a line: one kind or one place
  const check = (
    key: string,
    icon: string,
    label: string,
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
      <ThreeDIcon name={icon} size={24} />
      <span>{label}</span>
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

          {kinds.length > 1 && (
            <>
              <p className="view-menu-heading">
                {tc('eventView.headings.kinds')}
              </p>
              <div className="view-menu-grid">
                {kinds.map((kind) =>
                  check(
                    kind.key,
                    kind.icon,
                    tc(`eventKinds.${kind.key}`),
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
                    'map-pin',
                    location.name,
                    places.includes(location.slug),
                    () => onTogglePlace(location.slug)
                  )
                )}
              </div>
            </>
          )}

          {!view.showPast && (
            <>
              <p className="view-menu-heading">
                {tc('eventView.headings.when')}
              </p>
              {row('anytime', 'star', !view.when, () => onChange({ when: '' }))}
              {row('today', 'sun', view.when === 'today', () =>
                onChange({ when: 'today' })
              )}
              {row('weekend', 'tea-cup', view.when === 'weekend', () =>
                onChange({ when: 'weekend' })
              )}
              {row('week', 'travel', view.when === 'week', () =>
                onChange({ when: 'week' })
              )}
            </>
          )}

          <p className="view-menu-heading">{tc('eventView.headings.more')}</p>
          {row('rsvp', 'tick', view.rsvp, () => onChange({ rsvp: !view.rsvp }))}
        </div>
      )}
    </div>
  );
}

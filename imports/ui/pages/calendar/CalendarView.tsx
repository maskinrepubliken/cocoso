import { Meteor } from 'meteor/meteor';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Calendar, dayjsLocalizer, type View } from 'react-big-calendar';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import dayjs from 'dayjs';
import { useAtomValue } from 'jotai';
import RepeatIcon from 'lucide-react/dist/esm/icons/repeat';

if (Meteor.isClient) {
  import('react-big-calendar/lib/css/react-big-calendar.css');
}
import useMediaQuery from '/imports/api/_utils/useMediaQuery';
import { canCreateContentAtom, renderedAtom } from '/imports/state';
import { isFeatureEnabled } from '/imports/api/_utils/features';
import NewEntryHandler from '/imports/ui/forms/NewEntryHandler';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';

import NewCalendarActivity from './NewCalendarActivity';
import DayView from './DayView';

const weekday = require('dayjs/plugin/weekday');

dayjs.extend(weekday);
dayjs().weekday(1);

interface CalendarActivity {
  _id: string;
  title: string;
  start: Date;
  end: Date;
  isMultipleDay?: boolean;
  // The place's colour world, read in CSS as --ev-ink / --ev-tint
  ink?: string;
  tint?: string;
  isRecurring?: boolean;
}

interface Resource {
  _id: string;
  label: string;
  isBookable?: boolean;
}

interface CalendarViewProps {
  activities: CalendarActivity[];
  resources: Resource[];
  // Shown at the end of the toolbar, after the views (the Filter)
  toolbarEnd?: React.ReactNode;
  onSelect: (activity: CalendarActivity, e: React.SyntheticEvent) => void;
  onSelectSlot: (slotInfo: any) => void;
}

// How an event reads in a cell or a list row: a repeat mark for the weekly
// ones, then the title. The place's colour comes from the wrapper.
function EventContent({ event }: { event: CalendarActivity }) {
  return (
    <span className="cal-event-title">
      {event.isRecurring && (
        <RepeatIcon className="cal-event-repeat" width={12} height={12} />
      )}
      <span className="cal-event-text">{event.title}</span>
    </span>
  );
}

// What goes at the end of the toolbar, handed down past react-big-calendar
// (a context, so the toolbar stays one component and keeps its state).
const ToolbarEndContext = createContext<React.ReactNode>(null);

// react-big-calendar's toolbar as it was (same markup and classes, so the
// same look), with something of our own beside it at the end. Beside, not
// inside: the library styles every button in .rbc-toolbar.
function CalendarToolbar({
  label,
  localizer,
  onNavigate,
  onView,
  view,
  views,
}: any) {
  const end = useContext(ToolbarEndContext);
  const { messages } = localizer;
  return (
    <div className="cal-toolbar-row">
      <div className="rbc-toolbar">
        {/* As a player: back, today, forward */}
        <span className="rbc-btn-group cal-nav">
          <button
            type="button"
            className="cal-nav-prev"
            onClick={() => onNavigate('PREV')}
          >
            <ThreeDIcon name="backward" size={22} />
            <span className="cal-nav-text">{messages.previous}</span>
          </button>
          <button
            type="button"
            className="cal-nav-today"
            onClick={() => onNavigate('TODAY')}
          >
            {messages.today}
          </button>
          <button
            type="button"
            className="cal-nav-next"
            onClick={() => onNavigate('NEXT')}
          >
            <span className="cal-nav-text">{messages.next}</span>
            <ThreeDIcon name="forward" size={22} />
          </button>
        </span>
        <span className="rbc-toolbar-label">{label}</span>
        {views.length > 1 && (
          <span className="rbc-btn-group">
            {views.map((name: View) => (
              <button
                key={name}
                type="button"
                className={view === name ? 'rbc-active' : ''}
                onClick={() => onView(name)}
              >
                {messages[name]}
              </button>
            ))}
          </span>
        )}
      </div>
      {end && <div className="cal-toolbar-end">{end}</div>}
    </div>
  );
}

const DESKTOP_VIEWS: View[] = ['month', 'week', 'day', 'agenda'];

// The visitor's last view and date, so coming back to the calendar (the
// browser's back button, or a new visit in the same tab) lands where they
// left. The view is kept across visits, the date only for the tab.
const VIEW_KEY = 'cocoso.calendar.view';
const DATE_KEY = 'cocoso.calendar.date';

function rememberedView(): View | null {
  if (!Meteor.isClient) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(VIEW_KEY) as View | null;
    return stored && DESKTOP_VIEWS.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

function rememberedDate(): Date {
  if (Meteor.isClient) {
    try {
      const stored = window.sessionStorage.getItem(DATE_KEY);
      if (stored && dayjs(stored).isValid()) {
        return dayjs(stored).toDate();
      }
    } catch {
      // storage blocked: start at today
    }
  }
  return dayjs().toDate();
}

function remember(key: string, value: string, session = false) {
  try {
    (session ? window.sessionStorage : window.localStorage).setItem(key, value);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
}
// On a phone the month grid can't hold text, so the list comes first, the
// day on paper next, and the grid is kept as an overview of busy days.
const MOBILE_VIEWS: View[] = ['agenda', 'day', 'month'];
// The day view is our own (DayView.tsx); the rest are react-big-calendar's.
const VIEW_COMPONENTS = {
  month: true,
  week: true,
  day: DayView,
  agenda: true,
} as any;

export default function CalendarView({
  activities,
  resources,
  toolbarEnd,
  onSelect,
  onSelectSlot,
}: CalendarViewProps) {
  const [t] = useTranslation('calendar');
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const rendered = useAtomValue(renderedAtom);
  const localizer = useMemo(() => dayjsLocalizer(dayjs), []);
  const isNarrow = useMediaQuery('(max-width: 720px)');
  // null until the visitor picks a view (now or on an earlier visit): the
  // list on a phone, the month otherwise.
  const [view, setView] = useState<View | null>(rememberedView);
  const [date, setDate] = useState<Date>(rememberedDate);

  const changeView = (next: View) => {
    setView(next);
    remember(VIEW_KEY, next);
  };
  const navigateTo = (next: Date) => {
    setDate(next);
    remember(DATE_KEY, dayjs(next).format('YYYY-MM-DD'), true);
  };

  // The list when the screen is narrow, the month when it is wide, unless
  // the visitor has picked a view that fits the current width.
  const views = isNarrow ? MOBILE_VIEWS : DESKTOP_VIEWS;
  const shownView: View =
    view && views.includes(view) ? view : isNarrow ? 'agenda' : 'month';

  let culture = 'en-GB';
  if (i18n.language !== 'en') {
    culture = i18n.language;
  }
  dayjs.locale(culture);

  const messages = {
    allDay: t('bigCal.allDay'),
    previous: t('bigCal.previous'),
    next: t('bigCal.next'),
    today: t('bigCal.today'),
    month: t('bigCal.month'),
    week: t('bigCal.week'),
    day: t('bigCal.day'),
    agenda: t('bigCal.agenda'),
    date: t('bigCal.date'),
    time: t('bigCal.time'),
    event: t('bigCal.event'),
    noEventsInRange: t('bigCal.noEventsInRange'),
    // our own, read by DayView
    noEventsThisDay: t('bigCal.noEventsThisDay'),
    showMore: (total: number) => t('bigCal.showMore', { total }),
  };

  // The week and day grids start at seven in the morning; nothing happens
  // at night and the empty hours pushed the day below the fold.
  const dayBounds = useMemo(
    () => ({
      min: dayjs().hour(7).minute(0).second(0).toDate(),
      max: dayjs().hour(23).minute(59).second(0).toDate(),
    }),
    []
  );

  const formats = useMemo(
    () => ({
      agendaDateFormat: 'ddd D MMM',
      agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${dayjs(start).format('D MMM')} – ${dayjs(end).format('D MMM')}`,
      dayHeaderFormat: 'dddd D MMMM',
      monthHeaderFormat: 'MMMM YYYY',
      weekdayFormat: isNarrow ? 'dd' : 'ddd',
    }),
    [isNarrow]
  );

  return (
    <ToolbarEndContext.Provider value={toolbarEnd}>
      <Calendar
        allDayAccessor="isMultipleDay"
        className={`cal ${isNarrow ? 'is-narrow' : ''}`}
        components={{ event: EventContent, toolbar: CalendarToolbar }}
        culture={culture}
        date={date}
        dayLayoutAlgorithm="no-overlap"
        events={activities}
        formats={formats}
        length={isNarrow ? 21 : 30}
        localizer={localizer}
        max={dayBounds.max}
        messages={messages}
        min={dayBounds.min}
        popup
        popupOffset={30}
        selectable={isFeatureEnabled('bookings')}
        showMultiDayTimes
        step={60}
        timeslots={1}
        view={shownView}
        views={
          Object.fromEntries(
            views.map((view) => [view, VIEW_COMPONENTS[view]])
          ) as any
        }
        eventPropGetter={(event) => ({
          className: `cal-event ${event.isRecurring ? 'is-recurring' : ''}`,
          style: {
            ['--ev-ink' as any]: event.ink,
            ['--ev-tint' as any]: event.tint,
          },
        })}
        onNavigate={navigateTo}
        onSelectEvent={onSelect}
        onSelectSlot={onSelectSlot}
        onView={changeView}
      />

      {rendered && canCreateContent && isFeatureEnabled('bookings') ? (
        <NewEntryHandler context="calendar">
          <NewCalendarActivity resources={resources} />
        </NewEntryHandler>
      ) : null}
    </ToolbarEndContext.Provider>
  );
}

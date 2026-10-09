import { Meteor } from 'meteor/meteor';
import React, { useMemo, useState } from 'react';
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
import NewEntryHandler from '/imports/ui/forms/NewEntryHandler';

import NewCalendarActivity from './NewCalendarActivity';

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

const DESKTOP_VIEWS: View[] = ['month', 'week', 'day', 'agenda'];
// On a phone the month grid can't hold text, so the list comes first and
// the grid is kept as an overview of which days are busy.
const MOBILE_VIEWS: View[] = ['agenda', 'month'];

export default function CalendarView({
  activities,
  resources,
  onSelect,
  onSelectSlot,
}: CalendarViewProps) {
  const [t] = useTranslation('calendar');
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const rendered = useAtomValue(renderedAtom);
  const localizer = useMemo(() => dayjsLocalizer(dayjs), []);
  const isNarrow = useMediaQuery('(max-width: 720px)');
  // null until the visitor picks a view: the list on a phone, the month
  // otherwise.
  const [view, setView] = useState<View | null>(null);
  const [date, setDate] = useState<Date>(() => dayjs().toDate());

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
    <>
      <Calendar
        allDayAccessor="isMultipleDay"
        className={`cal ${isNarrow ? 'is-narrow' : ''}`}
        components={{ event: EventContent }}
        culture={culture}
        date={date}
        events={activities}
        formats={formats}
        length={isNarrow ? 21 : 30}
        localizer={localizer}
        max={dayBounds.max}
        messages={messages}
        min={dayBounds.min}
        popup
        popupOffset={30}
        selectable
        showMultiDayTimes
        step={60}
        view={shownView}
        views={views}
        eventPropGetter={(event) => ({
          className: `cal-event ${event.isRecurring ? 'is-recurring' : ''}`,
          style: {
            ['--ev-ink' as any]: event.ink,
            ['--ev-tint' as any]: event.tint,
          },
        })}
        onNavigate={setDate}
        onSelectEvent={onSelect}
        onSelectSlot={onSelectSlot}
        onView={setView}
      />

      {rendered && canCreateContent ? (
        <NewEntryHandler context="calendar">
          <NewCalendarActivity resources={resources} />
        </NewEntryHandler>
      ) : null}
    </>
  );
}

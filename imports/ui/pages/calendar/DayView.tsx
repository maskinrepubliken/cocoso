import React from 'react';
import dayjs from 'dayjs';
import { Navigate } from 'react-big-calendar';
import RepeatIcon from 'lucide-react/dist/esm/icons/repeat';
import { useTranslation } from 'react-i18next';

// The calendar's day view, drawn on paper instead of react-big-calendar's
// time grid: one row per event, in time order, with the place's colour as
// a dot. Simultaneous events stack instead of squeezing side by side.
interface DayEvent {
  _id?: string;
  activityId?: string;
  title: string;
  start: Date;
  end: Date;
  isMultipleDay?: boolean;
  resource?: string;
  isRecurring?: boolean;
  isCancelled?: boolean;
  ink?: string;
}

interface DayViewProps {
  date: Date;
  events: DayEvent[];
  onSelectEvent?: (event: DayEvent, e: React.SyntheticEvent) => void;
  localizer: {
    messages: { noEventsInRange: string; noEventsThisDay?: string };
  };
}

function DayView({ date, events, onSelectEvent, localizer }: DayViewProps) {
  const [tc] = useTranslation('common');
  const dayStart = dayjs(date).startOf('day');
  const dayEnd = dayjs(date).endOf('day');
  const todays = events
    .filter(
      (event) =>
        dayjs(event.start).isBefore(dayEnd) &&
        dayjs(event.end).isAfter(dayStart)
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (todays.length === 0) {
    return (
      <p className="cal-day-empty">
        {localizer.messages.noEventsThisDay ||
          localizer.messages.noEventsInRange}
      </p>
    );
  }

  return (
    <ol className="cal-day">
      {todays.map((event, index) => {
        const allDay =
          event.isMultipleDay ||
          (dayjs(event.start).isBefore(dayStart) &&
            dayjs(event.end).isAfter(dayEnd));
        return (
          <li key={`${event.activityId || event._id}-${index}`}>
            <button
              type="button"
              className="cal-day-row"
              style={{ ['--ev-ink' as any]: event.ink }}
              onClick={(e) => onSelectEvent?.(event, e)}
            >
              <span className="cal-day-time">
                {allDay
                  ? '•'
                  : `${dayjs(event.start).format('HH:mm')}–${dayjs(
                      event.end
                    ).format('HH:mm')}`}
              </span>
              <span className="cal-day-what">
                <strong className={event.isCancelled ? 'is-cancelled' : ''}>
                  {event.isRecurring && <RepeatIcon width={13} height={13} />}
                  {event.isCancelled && (
                    <span className="cal-event-cancelled">
                      {tc('event.cancelled.tag')}
                    </span>
                  )}
                  <span className="cal-day-title">{event.title}</span>
                </strong>
                {event.resource && <small>{event.resource}</small>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// What react-big-calendar needs from a custom view
DayView.navigate = (date: Date, action: string) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return dayjs(date).subtract(1, 'day').toDate();
    case Navigate.NEXT:
      return dayjs(date).add(1, 'day').toDate();
    default:
      return date;
  }
};

DayView.title = (date: Date) => {
  const text = dayjs(date).format('dddd D MMMM');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

DayView.range = (date: Date) => [dayjs(date).startOf('day').toDate()];

export default DayView;

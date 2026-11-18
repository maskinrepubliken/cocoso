import React from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import XIcon from 'lucide-react/dist/esm/icons/x';

import { Input } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import { WEEK, type Opening } from '/imports/ui/pages/businesses/hours';

interface OpeningHoursFieldsProps {
  value: Opening[];
  note: string;
  onChange: (value: Opening[]) => void;
  onNoteChange: (note: string) => void;
}

const weekdayName = (day: number) =>
  dayjs()
    .day(day % 7)
    .format('dddd');

// A time some hours later, at most five to midnight
const later = (time: string, hours: number) => {
  const [h, m] = time.split(':').map(Number);
  const minutes = Math.min(h * 60 + m + hours * 60, 23 * 60 + 55);
  return [Math.floor(minutes / 60), minutes % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
};

// Weekly hours as a row per weekday: none is closed, and a day can have
// more than one opening (lunch and dinner). A new opening starts where the
// day's last one ends, or as all of the day before's, or 10–18. Then a
// note for what the week does not say ("Stängt vecka 29–31").
export default function OpeningHoursFields({
  value,
  note,
  onChange,
  onNoteChange,
}: OpeningHoursFieldsProps) {
  const [tc] = useTranslation('common');

  const openingsOf = (day: number) =>
    value
      .map((opening, index) => ({ opening, index }))
      .filter(({ opening }) => opening.day === day);

  const update = (index: number, patch: Partial<Opening>) =>
    onChange(value.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  const add = (day: number) => {
    const own = openingsOf(day).map(({ opening }) => opening);
    const last = own[own.length - 1];
    // The nearest earlier day that is open, all its times
    const beforeDay = [...value].reverse().find((o) => o.day < day)?.day;
    const before = value.filter((o) => o.day === beforeDay);
    const added: Opening[] = last
      ? [{ day, opens: last.closes, closes: later(last.closes, 3) }]
      : before.length
      ? before.map((o) => ({ day, opens: o.opens, closes: o.closes }))
      : [{ day, opens: '10:00', closes: '18:00' }];
    onChange([...value, ...added].sort((a, b) => a.day - b.day));
  };

  const remove = (index: number) =>
    onChange(value.filter((_o, i) => i !== index));

  return (
    <div className="opening-hours-fields">
      {WEEK.map((day) => {
        const openings = openingsOf(day);
        return (
          <div key={day} className="opening-day">
            <span className="opening-day-name">{weekdayName(day)}</span>
            <div className="opening-day-times">
              {openings.length === 0 && (
                <span className="opening-day-closed">
                  {tc('businesses.closed')}
                </span>
              )}
              {openings.map(({ opening, index }) => (
                <span key={index} className="opening-interval">
                  <input
                    aria-label={tc('offerings.form.opens')}
                    step={300}
                    type="time"
                    value={opening.opens}
                    onChange={(e) =>
                      e.target.value && update(index, { opens: e.target.value })
                    }
                  />
                  <span aria-hidden>–</span>
                  <input
                    aria-label={tc('offerings.form.closes')}
                    step={300}
                    type="time"
                    value={opening.closes}
                    onChange={(e) =>
                      e.target.value &&
                      update(index, { closes: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="person-card-remove"
                    aria-label={tc('offerings.form.removeOpening')}
                    onClick={() => remove(index)}
                  >
                    <XIcon aria-hidden width={14} height={14} />
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              className="person-add-small"
              onClick={() => add(day)}
            >
              <PlusIcon aria-hidden width={14} height={14} />
              {openings.length
                ? tc('offerings.form.addOpeningMore')
                : tc('offerings.form.addOpening')}
            </button>
          </div>
        );
      })}
      <FormField
        helper={tc('offerings.form.hoursNoteHelper')}
        label={tc('offerings.form.hoursNote')}
        mt="4"
        optional
      >
        <Input
          placeholder={tc('offerings.form.hoursNoteHolder')}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      </FormField>
    </div>
  );
}

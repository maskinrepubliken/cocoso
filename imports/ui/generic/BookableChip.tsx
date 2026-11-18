import React from 'react';
import { useTranslation } from 'react-i18next';
import CalendarCheckIcon from 'lucide-react/dist/esm/icons/calendar-check';

import { Chip } from '/imports/ui/entry/EntryHero';

interface Place {
  booking?: object | null;
}

// A place that says how to book it (`booking`: info and a link, an
// organizer or contact details of its own).
export const isBookablePlace = (place?: Place | null): boolean =>
  Boolean(place?.booking);

// "Bokningsbar", in tegel like the other accent chips, on a place's page
// and its card in the gallery.
export default function BookableChip({ place }: { place?: Place | null }) {
  const [tc] = useTranslation('common');
  if (!isBookablePlace(place)) {
    return null;
  }
  return (
    <Chip accent>
      <CalendarCheckIcon aria-hidden />
      {tc('labels.bookable')}
    </Chip>
  );
}

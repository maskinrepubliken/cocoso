import React from 'react';
import { useTranslation } from 'react-i18next';
import CalendarCheckIcon from 'lucide-react/dist/esm/icons/calendar-check';

import { Chip } from '/imports/ui/entry/EntryHero';
import { isFeatureEnabled } from '/imports/api/_utils/features';

interface Place {
  isBookable?: boolean;
  booking?: object | null;
}

// Booked in the calendar (the `bookings` feature), or else a place that
// says how to book it (`booking`).
export const isBookablePlace = (place?: Place | null): boolean =>
  isFeatureEnabled('bookings')
    ? Boolean(place?.isBookable)
    : Boolean(place?.booking);

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

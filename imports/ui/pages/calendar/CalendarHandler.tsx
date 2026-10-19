import React, { useMemo } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import loadable from '@loadable/component';
import { useAtomValue } from 'jotai';

import { Loader, Skeleton } from '/imports/ui/core';
import { parseAllBookingsWithResources } from '/imports/api/_utils/shared';
import { canCreateContentAtom } from '/imports/state';
import { getWeeklyPattern } from '/imports/api/activities/recurrence';
import PageHeading from '/imports/ui/listing/PageHeading';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import { colorsForKind } from '/imports/ui/utils/kindPalette';
import EventViewMenu from '/imports/ui/listing/EventViewMenu';
import useEventFilters from '/imports/ui/listing/useEventFilters';
import { EVENT_KINDS } from '/imports/ui/pages/activities/eventKinds';

const CalendarView = loadable(() => import('./CalendarView'), {
  fallback: <Skeleton isEntry />,
});

interface SlotInfo {
  start: Date;
  end: Date;
  slots?: Date[];
}

interface Resource {
  _id: string;
  label: string;
  color?: string;
  isBookable: boolean;
  isCombo?: boolean;
  locationId?: string;
}

interface Activity {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  resourceId?: string;
  comboResourceId?: string;
  resource?: string;
  authorName: string;
  activityId: string;
  groupId?: string;
  isGroupMeeting?: boolean;
  isPublicActivity?: boolean;
  isGroupPrivate?: boolean;
  longDescription?: string;
}

interface CalendarHandlerProps {
  siteDoc: any;
}

const parseNewEntryParams = (
  slotInfo: SlotInfo,
  selectedResource: Resource | null,
  type: string
) => {
  const params = {
    startDate: dayjs(slotInfo?.start).format('YYYY-MM-DD'),
    endDate: dayjs(slotInfo?.end).format('YYYY-MM-DD'),
    startTime: dayjs(slotInfo?.start).format('HH:mm'),
    endTime: dayjs(slotInfo?.end).format('HH:mm'),
    resourceId: selectedResource ? selectedResource._id : '',
  };

  if (type !== 'other') {
    params.endDate = dayjs(slotInfo?.end).add(-1, 'days').format('YYYY-MM-DD');
    params.endTime = '23:59';
  }

  return params;
};

export default function CalendarHandler({ siteDoc }: CalendarHandlerProps) {
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const site = siteDoc;
  const { activities, resources } = useLoaderData() as {
    activities: Activity[];
    resources: Resource[];
  };

  const navigate = useNavigate();
  const prefix = useLocationPrefix();
  const [, setSearchParams] = useSearchParams();

  const activitiesParsed = useMemo(
    () => parseAllBookingsWithResources(activities, resources),
    [activities, resources]
  );

  // An event opens its page on the clicked date; a group meeting its group.
  const handleSelectActivity = (activity: Activity, e: React.MouseEvent) => {
    e.preventDefault();
    if (activity.isGroupMeeting) {
      navigate(`${prefix}/groups/${activity.groupId}`);
      return;
    }
    const listing = activity.isPublicActivity ? 'activities' : 'calendar';
    const query = new URLSearchParams({
      date: activity.startDate,
      time: activity.startTime,
    });
    navigate(`${prefix}/${listing}/${activity.activityId}?${query}`);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (!canCreateContent || !slotInfo) {
      return;
    }

    let type = 'other';

    if (slotInfo?.slots && slotInfo.slots.length === 1) {
      // One day selected in month view
      type = 'month-oneday';
    } else if (
      // Multiple days selected in month view
      slotInfo?.slots &&
      slotInfo.slots.length > 1 &&
      dayjs(slotInfo?.end).format('HH:mm') === '00:00'
    ) {
      type = 'month-multipledays';
    }

    // No venue is preselected; the form asks for the place.
    const dateParams = parseNewEntryParams(slotInfo, null, type);

    setSearchParams((params) => ({
      ...params,
      ...dateParams,
      new: true,
    }));
  };

  // The same Filter as on the events page: kinds and places; one moves
  // between days and weeks here, so not past/upcoming or a stretch of days.
  const filters = useEventFilters('calendar');
  const presentKinds = useMemo(() => {
    const keys = new Set(
      (activities as any[]).map((a) => a.category?.key).filter(Boolean)
    );
    return EVENT_KINDS.filter((kind) => keys.has(kind.key));
  }, [activities]);
  const filteredActivities = useMemo(
    () => (activitiesParsed || []).filter((act: any) => filters.matches(act)),
    [activitiesParsed, filters.filterKey]
  );

  // Weekly activities are drawn lighter so one-off events stand out.
  const recurringIds = useMemo(
    () =>
      new Set(
        activities
          .filter((a: any) => getWeeklyPattern(a.datesAndTimes))
          .map((a) => a._id)
      ),
    [activities]
  );

  // Every event is drawn in its kind's colour (kultur, idrott, …); events
  // without a kind take the site's green. Weekly activities are marked
  // recurring and drawn lighter, so one-off events stand out.
  const allFilteredActsWithColors = filteredActivities.map((act: any) => {
    const colors = colorsForKind(act.kind);
    return {
      ...act,
      isRecurring: recurringIds.has(act.activityId),
      ink: colors.ink,
      tint: colors.tint,
    };
  });

  if (!site) {
    return <Loader />;
  }

  const loading =
    !activities || activities.length < 1 || !resources || resources.length < 1;

  return (
    <>
      {loading && <Loader />}

      <PageHeading site={site || siteDoc} listing="calendar" />

      {/* The filter tile at the right edge, as at the end of the kinds on
          the events page */}
      <div className="kind-bar page-wrap">
        <EventViewMenu
          isNarrowed={
            filters.kinds.length > 0 ||
            (!filters.currentLocation && filters.placeSlugs.length > 0)
          }
          kinds={presentKinds}
          locations={filters.locations}
          places={filters.placeSlugs}
          selectedKinds={filters.kinds}
          view={filters.view}
          withTime={false}
          onChange={filters.setView}
          onToggleKind={filters.toggleKind}
          onTogglePlace={filters.togglePlace}
        />
      </div>

      {/* The calendar itself spans the whole viewport, gutter to gutter */}
      <div className="cal-full">
        <CalendarView
          activities={allFilteredActsWithColors}
          resources={resources}
          onSelect={handleSelectActivity}
          onSelectSlot={handleSelectSlot}
        />
      </div>
    </>
  );
}

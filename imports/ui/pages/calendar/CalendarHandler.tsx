import React, { useMemo, useState } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import loadable from '@loadable/component';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Center, Flex, Loader, Skeleton } from '/imports/ui/core';
import { parseAllBookingsWithResources } from '/imports/api/_utils/shared';
import { canCreateContentAtom, locationsAtom } from '/imports/state';
import { getWeeklyPattern } from '/imports/api/activities/recurrence';
import PageHeading from '/imports/ui/listing/PageHeading';
import Tag from '/imports/ui/generic/Tag';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import { colorsForKind } from '/imports/ui/utils/kindPalette';

const CalendarView = loadable(() => import('./CalendarView'), {
  fallback: <Skeleton isEntry />,
});

// The place filter is pill-shaped, like the event cards' chips; the tags
// take their corners from this variable.
const pillShapes = {
  '--cocoso-border-radius': '999px',
  fontFamily: 'Raleway, var(--cocoso-body-font-family, sans-serif)',
  '& *': { fontFamily: 'inherit' },
};

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
  const [locationFilter, setLocationFilter] = useState<string>('');
  const publishedLocations = useAtomValue(locationsAtom);
  const [tc] = useTranslation('common');
  const { activities: allActivities, resources: allResources } =
    useLoaderData() as {
      activities: Activity[];
      resources: Resource[];
    };
  const activities = useMemo(
    () =>
      locationFilter
        ? allActivities.filter(
            (a: any) => !a.locationId || a.locationId === locationFilter
          )
        : allActivities,
    [allActivities, locationFilter]
  );

  const [calendarFilter, setCalendarFilter] = useState<Resource | null>(null);

  // A place narrows the calendar to its resources and to activities filed
  // under it. Content without a place belongs to the whole municipality and
  // stays visible.
  const resources = useMemo(
    () =>
      locationFilter
        ? allResources.filter(
            (r) => !r.locationId || r.locationId === locationFilter
          )
        : allResources,
    [allResources, locationFilter]
  );
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

    const selectedResource = resources.find(
      (resource) => calendarFilter && resource._id === calendarFilter._id
    );

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

    const dateParams = parseNewEntryParams(
      slotInfo,
      selectedResource || null,
      type
    );

    setSearchParams((params) => ({
      ...params,
      ...dateParams,
      new: true,
    }));
  };

  const filteredActivities = activitiesParsed.filter(
    (activity: any) =>
      !calendarFilter ||
      calendarFilter._id === activity.resourceId ||
      calendarFilter._id === activity.comboResourceId
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

      <Box className="page-wrap">
        {publishedLocations.length > 0 && !prefix && (
          <Center mb="2" css={pillShapes}>
            <Flex justify="center" px="1" wrap="wrap">
              <Tag
                key="all-locations"
                checkable
                label={tc('locations.wholeMunicipality')}
                filterColor="#484848"
                checked={!locationFilter}
                onClick={() => {
                  setLocationFilter('');
                  setCalendarFilter(null);
                }}
              />
              {publishedLocations.map((location) => (
                <Tag
                  key={location._id}
                  checkable
                  label={location.name}
                  filterColor="#484848"
                  checked={locationFilter === location._id}
                  onClick={() => {
                    setLocationFilter(location._id);
                    setCalendarFilter(null);
                  }}
                />
              ))}
            </Flex>
          </Center>
        )}
      </Box>

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

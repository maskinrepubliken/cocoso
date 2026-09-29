import React, { useEffect, useMemo, useState } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import loadable from '@loadable/component';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Button, Center, Flex, Loader, Skeleton } from '/imports/ui/core';
import {
  getNonComboResourcesWithColor,
  getComboResourcesWithColor,
  parseAllBookingsWithResources,
} from '/imports/api/_utils/shared';
import { canCreateContentAtom, locationsAtom } from '/imports/state';
import { getWeeklyPattern } from '/imports/api/activities/recurrence';
import PageHeading from '/imports/ui/listing/PageHeading';
import Tag from '/imports/ui/generic/Tag';
import { cocosoReactSelectAdapter } from '/imports/ui/utils/globalStylesManager';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

const CalendarView = loadable(() => import('./CalendarView'), {
  fallback: <Skeleton isEntry />,
});

const maxResourceLabelsToShow = 13;

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
  resourceColor?: string;
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

  const nonComboResources = resources.filter((resource) => !resource.isCombo);
  const nonComboResourcesWithColor =
    getNonComboResourcesWithColor(nonComboResources);

  const comboResources = resources.filter((resource) => resource.isCombo);
  const comboResourcesWithColor = getComboResourcesWithColor(
    comboResources,
    nonComboResourcesWithColor
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

  const allFilteredActsWithColors = filteredActivities.map((act: any) => {
    const resource = nonComboResourcesWithColor.find(
      (res: any) => res._id === act.resourceId
    );
    const resourceColor = (resource && resource.color) || '#484848';

    const isRecurring = recurringIds.has(act.activityId);

    return {
      ...act,
      title: isRecurring ? `↻ ${act.title}` : act.title,
      isRecurring,
      resourceColor,
    };
  });

  const selectFilterView =
    nonComboResourcesWithColor.filter((r: any) => r.isBookable)?.length >=
    maxResourceLabelsToShow;

  const allResourcesForSelect = [
    ...comboResourcesWithColor,
    ...nonComboResourcesWithColor,
  ]?.filter((r: any) => r.isBookable);

  // Lazy load react-select components when selectFilterView is true
  const [SelectComponent, setSelectComponent] = useState<any>(null);
  const [AnimatedComponents, setAnimatedComponents] = useState<any>(null);

  useEffect(() => {
    if (selectFilterView && !SelectComponent) {
      Promise.all([
        import('react-select'),
        import('react-select/animated'),
      ]).then(([selectMod, animatedMod]) => {
        setSelectComponent(() => selectMod.default);
        setAnimatedComponents(animatedMod.default());
      });
    }
  }, [selectFilterView, SelectComponent]);

  if (!site) {
    return <Loader />;
  }

  const loading =
    !activities || activities.length < 1 || !resources || resources.length < 1;

  return (
    <>
      {loading && <Loader />}

      <PageHeading site={site || siteDoc} listing="calendar" />

      <Box>
        {publishedLocations.length > 0 && (
          <Center mb="2">
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

        <Center mb="2">
          {!selectFilterView ? (
            <Box>
              <Flex justify="center" px="1" pb="1" mb="3" wrap="wrap">
                <Box>
                  <Tag
                    key="All"
                    checkable
                    label={<Trans i18nKey="common:labels.all">All</Trans>}
                    filterColor="#484848"
                    checked={!calendarFilter}
                    css={{ alignSelf: 'center' }}
                    onClick={() => setCalendarFilter(null)}
                  />
                </Box>

                {nonComboResourcesWithColor
                  .filter((r: any) => r.isBookable)
                  .map((resource: any) => (
                    <Box key={resource._id}>
                      <Tag
                        checkable
                        label={resource.label}
                        filterColor={resource.color}
                        checked={calendarFilter?._id === resource._id}
                        onClick={() => setCalendarFilter(resource)}
                      />
                    </Box>
                  ))}
              </Flex>
              <Flex justify="center" mb="2" px="1" wrap="wrap">
                {comboResourcesWithColor
                  .filter((r: any) => r.isBookable)
                  .map((resource: any) => (
                    <Box key={resource._id}>
                      <Tag
                        checkable
                        label={resource.label}
                        filterColor={'#2d2d2d'}
                        gradientBackground={resource.color}
                        checked={calendarFilter?._id === resource._id}
                        onClick={() => setCalendarFilter(resource)}
                      />
                    </Box>
                  ))}
              </Flex>
            </Box>
          ) : (
            <Flex w="30rem">
              <Button
                mr="2"
                size="sm"
                variant={calendarFilter ? 'outline' : 'solid'}
                onClick={() => setCalendarFilter(null)}
              >
                {<Trans i18nKey="common:labels.all">All</Trans>}
              </Button>

              <Box w="100%">
                {SelectComponent ? (
                  <SelectComponent
                    components={AnimatedComponents || undefined}
                    isClearable
                    options={allResourcesForSelect}
                    style={{ width: '100%', marginTop: '1rem' }}
                    styles={{
                      control: cocosoReactSelectAdapter,
                      option: (styles, { data }) => ({
                        ...styles,
                        borderLeft: `8px solid ${data.color}`,
                        // background: data.color.replace('40%', '90%'),
                        paddingLeft: !data.isCombo && 6,
                        fontWeight: data.isCombo ? 'bold' : 'normal',
                      }),
                    }}
                    value={calendarFilter}
                    getOptionValue={(option) => option._id}
                    onChange={(value) => setCalendarFilter(value)}
                  />
                ) : (
                  <Box h="2.5rem" w="100%" />
                )}
              </Box>
            </Flex>
          )}
        </Center>

        <Box mb="4">
          <CalendarView
            activities={allFilteredActsWithColors}
            resources={resources}
            onSelect={handleSelectActivity}
            onSelectSlot={handleSelectSlot}
          />
        </Box>
      </Box>
    </>
  );
}

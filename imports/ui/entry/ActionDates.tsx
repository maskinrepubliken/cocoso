import dayjs from 'dayjs';
import React from 'react';

import { Box, Flex } from '../core';
import { DateJust } from './FancyDate';


export interface DateOccurrence {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface Activity {
  datesAndTimes?: DateOccurrence[];
}

// Day bounds are read when called, not when the module loads: the server
// runs for weeks and would otherwise keep the day it started on.
const getFutureOccurrences = (dates: DateOccurrence[]): DateOccurrence[] => {
  const yesterday = dayjs().add(-1, 'days').format('YYYY-MM-DD');
  return dates.filter((date) =>
    dayjs(date.endDate, 'YYYY-MM-DD').isAfter(yesterday)
  );
};

const getPastOccurrences = (dates: DateOccurrence[]): DateOccurrence[] => {
  const today = dayjs().format('YYYY-MM-DD');
  return dates.filter((date) =>
    dayjs(date.endDate, 'YYYY-MM-DD').isBefore(today)
  );
};

export interface ActionDatesProps {
  activity?: Activity | null;
  showPast?: boolean;
  showTime?: boolean;
}

export default function ActionDates({
  activity,
  showPast = false,
  showTime = true,
}: ActionDatesProps) {
  if (!activity || !activity.datesAndTimes || !activity.datesAndTimes.length) {
    return null;
  }

  const dates = showPast
    ? getPastOccurrences(activity.datesAndTimes)
    : getFutureOccurrences(activity.datesAndTimes);

  if (!dates || !dates.length) {
    return null;
  }

  return (
    <Flex justify="center" gap="2" wrap="wrap">
      {dates.map(
        (occurrence, occurrenceIndex) =>
          occurrence && (
            <Flex
              key={occurrence.startDate + occurrence.startTime}
              pl={occurrenceIndex === 0 ? '0' : '2'}
              pr="2"
              py="1"
            >
              <Box>
                <DateJust time={showTime ? occurrence.startTime : null}>
                  {occurrence.startDate}
                </DateJust>
              </Box>
              {occurrence.startDate !== occurrence.endDate && (
                <Flex>
                  <span style={{ margin: '0 4px', fontSize: '200%' }}>
                    {'-'}
                  </span>
                  <DateJust time={showTime ? occurrence.endTime : null}>
                    {occurrence.endDate}
                  </DateJust>
                </Flex>
              )}
            </Flex>
          )
      )}
    </Flex>
  );
}

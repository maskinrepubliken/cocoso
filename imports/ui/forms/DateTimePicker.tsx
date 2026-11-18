import React, { useState, useEffect } from 'react';
import loadable from '@loadable/component';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { Box, Flex, Text, Skeleton } from '/imports/ui/core';

dayjs.extend(customParseFormat);

// Lazy load antd components - they're heavy!
const AntTimePicker = loadable(() => import('antd/lib/time-picker'), {
  ssr: false, // antd components don't work well with SSR
});
const AntDatePicker = loadable(() => import('antd/lib/date-picker'), {
  ssr: false,
});
const ConfigProvider = loadable(() => import('antd/lib/config-provider'), {
  ssr: false,
});
const AntCalendar = loadable(() => import('antd/lib/calendar'), {
  ssr: false,
});

// Lazy load locales
const loadLocale = async (lang: string) => {
  switch (lang) {
    case 'sv':
      return (await import('antd/locale/sv_SE')).default;
    default:
      return (await import('antd/locale/en_GB')).default;
  }
};

const antTheme = {
  components: {
    DatePicker: {
      zIndexPopup: 1500,
    },
    TimePicker: {
      zIndexPopup: 1500,
    },
  },
};

interface DatePickerProps {
  disabledDate?: string;
  label?: string;
  value?: string;
  onChange?: (date: any) => void;
  DatePickerComponent: any;
}

function DatePicker({
  disabledDate,
  label,
  value,
  onChange,
  DatePickerComponent,
}: DatePickerProps) {
  if (!DatePickerComponent) {
    return (
      <Box mb="4">
        <Text mb="2">{label}</Text>
        <Box h="40px" w="170px" />
      </Box>
    );
  }
  return (
    <Box mb="4">
      <Text mb="2">{label}</Text>
      <DatePickerComponent
        disabledDate={
          disabledDate ? (date) => date && date < dayjs(disabledDate) : null
        }
        size="large"
        value={dayjs(value, 'YYYY-MM-DD')}
        onChange={onChange}
      />
    </Box>
  );
}

interface TimePickerProps {
  label?: string;
  value?: string;
  onChange?: (time: any) => void;
  TimePickerComponent: any;
}

function TimePicker({
  label,
  value,
  onChange,
  TimePickerComponent,
  optional = false,
}: TimePickerProps & { optional?: boolean }) {
  if (!TimePickerComponent) {
    return (
      <Box>
        <Text mb="2">{label}</Text>
        <Box h="40px" w="170px" />
      </Box>
    );
  }
  return (
    <Box>
      <Text mb="2">{label}</Text>
      <TimePickerComponent
        allowClear={optional}
        format="HH:mm"
        minuteStep={5}
        needConfirm={false}
        size="large"
        value={value ? dayjs(value, 'HH:mm') : null}
        onChange={onChange}
      />
    </Box>
  );
}

// Over the open month: the month's name between two arrows, no year
function MonthHeader({ value, onChange }: { value: any; onChange: (d: any) => void }) {
  const button = {
    background: 'none',
    border: 0,
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '1.2rem',
    height: '2rem',
    lineHeight: 1,
    width: '2rem',
  };
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.5rem 0.5rem 0.25rem',
      }}
    >
      <button
        aria-label={value.subtract(1, 'month').format('MMMM')}
        style={button}
        type="button"
        onClick={() => onChange(value.subtract(1, 'month'))}
      >
        ‹
      </button>
      <strong style={{ textTransform: 'capitalize' }}>
        {value.format('MMMM')}
      </strong>
      <button
        aria-label={value.add(1, 'month').format('MMMM')}
        style={button}
        type="button"
        onClick={() => onChange(value.add(1, 'month'))}
      >
        ›
      </button>
    </div>
  );
}

interface DateTimeValue {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isRange?: boolean;
}

export interface DateTimePickerProps {
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  // The end time may be left out (it can then be cleared); its label
  endOptional?: boolean;
  endLabel?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  endOptional = false,
  endLabel,
}: DateTimePickerProps) {
  const [t] = useTranslation('activities');
  const { i18n } = useTranslation();
  const [locale, setLocale] = useState<any>(null);

  const isRange = value?.isRange || value.startDate !== value.endDate;

  // Load locale dynamically
  useEffect(() => {
    loadLocale(i18n.language).then(setLocale);
  }, [i18n.language]);

  const handleDateChange = (date: any, entity: string) => {
    if (!date) {
      return;
    }

    const parsedValue = {
      ...value,
    };

    if (isRange) {
      if (entity === 'endDate') {
        parsedValue.endDate = date.format('YYYY-MM-DD');
      } else {
        parsedValue.startDate = date.format('YYYY-MM-DD');
        if (dayjs(parsedValue.startDate).isAfter(dayjs(parsedValue.endDate))) {
          parsedValue.endDate = date.format('YYYY-MM-DD');
        }
      }
    } else {
      parsedValue.startDate = date.format('YYYY-MM-DD');
      parsedValue.endDate = date.format('YYYY-MM-DD');
    }

    onChange(parsedValue);
  };

  const handleTimeChange = (time: any, entity: 'startTime' | 'endTime') => {
    const parsedValue = {
      ...value,
    };

    if (!time) {
      // Only an optional end time can be cleared
      if (entity !== 'endTime' || !endOptional) {
        return;
      }
      parsedValue.endTime = '';
      onChange(parsedValue);
      return;
    }

    parsedValue[entity] = time.format('HH:mm');
    // Ending before it starts on the same day: the end moves along, or,
    // when it may be left out, is left out
    if (
      !isRange &&
      parsedValue.endTime &&
      parsedValue.startTime &&
      parsedValue.endTime < parsedValue.startTime
    ) {
      parsedValue.endTime = endOptional ? '' : parsedValue.startTime;
    }

    onChange(parsedValue);
  };

  // Show skeleton while antd components and locale load
  if (!locale) {
    return (
      <Box w="100%" py="2">
        <Skeleton isEntry={false} count={2} />
      </Box>
    );
  }

  return (
    <Box w="100%" py="2">
      <ConfigProvider locale={locale} theme={antTheme}>
        {/* One day: the month laid open, the day picked with one tap;
          days already past are off */}
        {!isRange && (
          <Box mb="4">
            <Text mb="2">{t('form.days.single')}</Text>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--cocoso-linje)',
                borderRadius: '12px',
                maxWidth: '22rem',
                overflow: 'hidden',
              }}
            >
              <AntCalendar
                disabledDate={(date: any) =>
                  date && date.isBefore(dayjs(), 'day')
                }
                fullscreen={false}
                headerRender={({ value: shown, onChange: show }: any) => (
                  <MonthHeader value={shown} onChange={show} />
                )}
                value={dayjs(value?.startDate, 'YYYY-MM-DD')}
                onSelect={(date: any) => handleDateChange(date, 'startDate')}
              />
            </div>
          </Box>
        )}
        <Flex>
          {isRange && (
            <Box w="170px" mr="2">
              <DatePicker
                DatePickerComponent={AntDatePicker}
                label={t('form.date.start')}
                value={value?.startDate}
                onChange={(date) => handleDateChange(date, 'startDate')}
              />
            </Box>
          )}

          {isRange && (
            <Box w="170px" mr="2">
              <DatePicker
                DatePickerComponent={AntDatePicker}
                disabledDate={value.startDate}
                label={t('form.date.finish')}
                value={value?.endDate}
                onChange={(date) => handleDateChange(date, 'endDate')}
              />
            </Box>
          )}
        </Flex>

        <Flex>
          <Box w="170px" mr="2">
            <TimePicker
              TimePickerComponent={AntTimePicker}
              label={t('form.time.start')}
              value={value?.startTime}
              onChange={(time) => handleTimeChange(time, 'startTime')}
            />
          </Box>

          <Box w="170px">
            <TimePicker
              TimePickerComponent={AntTimePicker}
              label={endLabel || t('form.time.finish')}
              optional={endOptional}
              value={value?.endTime}
              onChange={(time) => handleTimeChange(time, 'endTime')}
            />
          </Box>
        </Flex>
      </ConfigProvider>
    </Box>
  );
}

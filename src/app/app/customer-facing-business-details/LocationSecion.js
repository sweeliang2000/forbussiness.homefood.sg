'use client'

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TextField } from '@mui/material';

import styles from './LocationSection.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import OpeningHoursInput from './views/OpeningHoursInput';

dayjs.extend(utc);
dayjs.extend(timezone);

const LOCATION_NAME = 'locationName';
const ADDRESS = 'address';
const POSTAL_CODE = 'postalCode';
const DAY_CONFIG = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const sgtTime = (timeStr) => dayjs.tz(`2024-01-01T${timeStr}`, 'Asia/Singapore');
const makeDefaultHours = () => ({
  monday: { isOpen: true, start: sgtTime('08:00'), end: sgtTime('22:00') },
  tuesday: { isOpen: true, start: sgtTime('08:00'), end: sgtTime('22:00') },
  wednesday: { isOpen: true, start: sgtTime('08:00'), end: sgtTime('22:00') },
  thursday: { isOpen: true, start: sgtTime('08:00'), end: sgtTime('22:00') },
  friday: { isOpen: true, start: sgtTime('08:00'), end: sgtTime('22:00') },
  saturday: { isOpen: true, start: sgtTime('08:00'), end: sgtTime('22:00') },
  sunday: { isOpen: true, start: sgtTime('08:00'), end: sgtTime('22:00') },
});

const makeDefaultLocation = () => ({
  [LOCATION_NAME]: '',
  [ADDRESS]: '',
  [POSTAL_CODE]: '',
  operatingHours: makeDefaultHours(),
});

const parseHourValue = (rawValue, fallback) => {
  if (!rawValue) return fallback;
  const parsed = dayjs.tz(`2024-01-01 ${rawValue}`, 'YYYY-MM-DD hh:mm A', 'Asia/Singapore');
  return parsed.isValid() ? parsed : fallback;
};

const formatSGT = (timeValue) => timeValue.tz('Asia/Singapore').format('hh:mm A');

const normalizeFromLocation = (location) => {
  const fallback = makeDefaultLocation();
  if (!location) return fallback;
  const sourceHours = location.operatingHours ?? {};
  const normalizedHours = {};

  DAY_CONFIG.forEach(({ key }) => {
    const sourceDay = sourceHours[key] ?? {};
    const isOpen = sourceDay.isOpen ?? true;
    const defaultStart = fallback.operatingHours[key].start;
    const defaultEnd = fallback.operatingHours[key].end;
    normalizedHours[key] = {
      isOpen,
      start: parseHourValue(sourceDay.start, defaultStart),
      end: parseHourValue(sourceDay.end, defaultEnd),
    };
  });

  return {
    [LOCATION_NAME]: location.locationName ?? '',
    [ADDRESS]: location.address ?? '',
    [POSTAL_CODE]: location.postalCode ?? '',
    operatingHours: normalizedHours,
  };
};

const toPayloadLocation = (draftLocation) => {
  const operatingHours = {};
  DAY_CONFIG.forEach(({ key }) => {
    const dayValue = draftLocation.operatingHours[key];
    operatingHours[key] = {
      isOpen: dayValue.isOpen,
      start: dayValue.isOpen ? formatSGT(dayValue.start) : '12:00 AM',
      end: dayValue.isOpen ? formatSGT(dayValue.end) : '12:00 AM',
    };
  });

  return {
    locationName: draftLocation.locationName,
    address: draftLocation.address,
    postalCode: draftLocation.postalCode,
    operatingHours,
  };
};

const LocationSection = ({
  location,
  setLocation,
  resetSaving,
  isEdit = true,
}) => {
  const initialDraft = useMemo(() => normalizeFromLocation(location), [location]);
  const [locationDraft, setLocationDraft] = useState(initialDraft);

  useEffect(() => {
    setLocationDraft(normalizeFromLocation(location));
  }, [location]);

  const syncLocation = (nextDraft) => {
    setLocationDraft(nextDraft);
    setLocation(toPayloadLocation(nextDraft));
    resetSaving();
  };

  const updateField = (key, value) => {
    syncLocation({
      ...locationDraft,
      [key]: value,
    });
  };

  const updateDay = (dayKey, patch) => {
    syncLocation({
      ...locationDraft,
      operatingHours: {
        ...locationDraft.operatingHours,
        [dayKey]: {
          ...locationDraft.operatingHours[dayKey],
          ...patch,
        },
      },
    });
  };

  return (
    <ContentCard className={styles.content}>
      <FieldHeader
        title='Location'
        description='This setup supports one location. Update the details directly here.'
        type='h3'
      />

      <TextField
        label='Location Name'
        variant='outlined'
        placeholder='Ang Mo Kio Hub'
        fullWidth
        value={locationDraft.locationName}
        onChange={(event) => updateField(LOCATION_NAME, event.target.value)}
        disabled={!isEdit}
      />

      <TextField
        label='Address'
        variant='outlined'
        placeholder='53 Ang Mo Kio Ave 3, #01-09/10'
        fullWidth
        value={locationDraft.address}
        onChange={(event) => updateField(ADDRESS, event.target.value)}
        disabled={!isEdit}
      />

      <TextField
        label='Postal Code'
        variant='outlined'
        placeholder='569933'
        type='number'
        fullWidth
        value={locationDraft.postalCode}
        onChange={(event) => updateField(POSTAL_CODE, event.target.value)}
        disabled={!isEdit}
      />

      <div>
        <FieldHeader
          title='Opening Hours'
          description='Set your operating hours for each day. Turn a day off when your shop is closed.'
          type='h3'
        />
        {DAY_CONFIG.map((day) => (
          <div key={day.key} className={styles.dayRow}>
            <OpeningHoursInput
              dayLabel={day.label}
              isOpen={locationDraft.operatingHours[day.key].isOpen}
              onToggleOpen={(event) => updateDay(day.key, { isOpen: event.target.checked })}
              openTime={locationDraft.operatingHours[day.key].start}
              closeTime={locationDraft.operatingHours[day.key].end}
              onOpenTimeChange={(time) => updateDay(day.key, { start: time })}
              onCloseTimeChange={(time) => updateDay(day.key, { end: time })}
              disabled={!isEdit}
            />
          </div>
        ))}
      </div>
    </ContentCard>
  );
};

export default LocationSection;
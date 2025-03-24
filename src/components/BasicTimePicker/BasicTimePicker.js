import * as React from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function CustomTimePicker({ selectedTime, setSelectedTime }) {
  // Convert SGT time to local for display
  const displayTime = selectedTime.tz('Asia/Singapore').local();

  const handleTimeChange = (newTime) => {
    if (newTime) {
      // Reapply SGT timezone to the picked local time
      const sgtTime = dayjs.tz(
        newTime.format('HH:mm'),
        'HH:mm',
        'Asia/Singapore'
      );
      setSelectedTime(sgtTime);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TimePicker
        value={displayTime}
        onChange={handleTimeChange}
        ampm={true}
        views={['hours', 'minutes']}
        format='hh:mm A'
      />
    </LocalizationProvider>
  );
}

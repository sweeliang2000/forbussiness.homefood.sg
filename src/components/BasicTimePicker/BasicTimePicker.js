import * as React from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';

export default function CustomTimePicker() {
  const [selectedTime, setSelectedTime] = React.useState(dayjs('2024-10-15T08:00'));

  const handleTimeChange = (newTime) => {
    setSelectedTime(newTime);
    console.log('Selected Time:', newTime.format('hh:mm A')); // 12-hour format with AM/PM
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TimePicker
        value={selectedTime}
        onChange={handleTimeChange}
        ampm={true} // Enable AM/PM selection
        views={['hours', 'minutes']}
        format="hh:mm A" // Display in 12-hour format
        fullWidth
      />
    </LocalizationProvider>
  );
}

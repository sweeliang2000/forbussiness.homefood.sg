import styles from './OpeningHoursInput.module.css';
import { FormControlLabel, Switch } from '@mui/material';
import BasicTimePicker from '@/components/BasicTimePicker/BasicTimePicker';

const OpeningHoursInput = ({
    dayLabel,                // e.g., "Monday"
    isOpen,                  // boolean for switch state
    onToggleOpen,            // function for switch toggle
    openTime,                // Date object or time string for opening time
    closeTime,               // Date object or time string for closing time
    onOpenTimeChange,        // function to handle opening time change
    onCloseTimeChange,       // function to handle closing time change
    disabled = false         // whether the input is disabled
}) => {
    return (
        <div className={styles.subContainer}>
            <div className={styles.headerContainer}>
                <p className={styles.subHeader}>{dayLabel}</p>
                <FormControlLabel
                    control={
                        <Switch
                            checked={isOpen}
                            onChange={onToggleOpen}
                            disabled={disabled}
                        />
                    }
                    label="Open for Business?"
                    labelPlacement="start"
                />
            </div>

            {isOpen && (
                <div className={styles.timePickerContainer}>
                    <div className={styles.timePickSubContainer}>
                        <p>Opened at</p>
                        <BasicTimePicker
                            selectedTime={openTime}
                            setSelectedTime={onOpenTimeChange}
                            disabled={disabled}
                        />
                    </div>
                    <div className={styles.timePickSubContainer}>
                        <p>Closed at</p>
                        <BasicTimePicker
                            selectedTime={closeTime}
                            setSelectedTime={onCloseTimeChange}
                            disabled={disabled}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default OpeningHoursInput;

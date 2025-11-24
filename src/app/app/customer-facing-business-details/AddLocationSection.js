import BasicTimePicker from '@/components/BasicTimePicker/BasicTimePicker';
import styles from './AddLocationSection.module.css';
import { Backdrop, FormControlLabel, Switch, TextField } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import { Button } from '@mui/material'
import { useEffect, useState } from 'react';
import OpeningHoursInput from './views/OpeningHoursInput';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const LOCATION_NAME = 'locationName';
const ADDRESS = 'address';
const POSTAL_CODE = 'postalCode';
const MONDAY_IS_OPEN = 'mondayIsOpen';
const MONDAY_START = 'mondayStart';
const MONDAY_END = 'mondayEnd';
const TUESDAY_IS_OPEN = 'tuesdayIsOpen';
const TUESDAY_START = 'tuesdayStart';
const TUESDAY_END = 'tuesdayEnd';
const WEDNESDAY_IS_OPEN = 'wednesdayIsOpen';
const WEDNESDAY_START = 'wednesdayStart';
const WEDNESDAY_END = 'wednesdayEnd';
const THURSDAY_IS_OPEN = 'thursdayIsOpen';
const THURSDAY_START = 'thursdayStart';
const THURSDAY_END = 'thursdayEnd';
const FRIDAY_IS_OPEN = 'fridayIsOpen';
const FRIDAY_START = 'fridayStart';
const FRIDAY_END = 'fridayEnd';
const SATURDAY_IS_OPEN = 'saturdayIsOpen';
const SATURDAY_START = 'saturdayStart';
const SATURDAY_END = 'saturdayEnd';
const SUNDAY_IS_OPEN = 'sundayIsOpen';
const SUNDAY_START = 'sundayStart';
const SUNDAY_END = 'sundayEnd';


const AddLocationSection = ({
    selectedLocation,
    locations,
    setLocations,
    closeAddLocationHandler,
    isAddLocationOpen,
    resetSaving,
    isEdit = true
}) => {

    const sgtTime = (timeStr) => dayjs.tz(`2024-01-01T${timeStr}`, 'Asia/Singapore');

    const [enteredValues, setEnteredValues] = useState({
        [LOCATION_NAME]: '',
        [ADDRESS]: '',
        [POSTAL_CODE]: '',
        [MONDAY_IS_OPEN]: true,
        [MONDAY_START]: sgtTime('08:00'),
        [MONDAY_END]: sgtTime('22:00'),
        [TUESDAY_IS_OPEN]: true,
        [TUESDAY_START]: sgtTime('08:00'),
        [TUESDAY_END]: sgtTime('22:00'),
        [WEDNESDAY_IS_OPEN]: true,
        [WEDNESDAY_START]: sgtTime('08:00'),
        [WEDNESDAY_END]: sgtTime('22:00'),
        [THURSDAY_IS_OPEN]: true,
        [THURSDAY_START]: sgtTime('08:00'),
        [THURSDAY_END]: sgtTime('22:00'),
        [FRIDAY_IS_OPEN]: true,
        [FRIDAY_START]: sgtTime('08:00'),
        [FRIDAY_END]: sgtTime('22:00'),
        [SATURDAY_IS_OPEN]: true,
        [SATURDAY_START]: sgtTime('08:00'),
        [SATURDAY_END]: sgtTime('22:00'),
        [SUNDAY_IS_OPEN]: true,
        [SUNDAY_START]: sgtTime('08:00'),
        [SUNDAY_END]: sgtTime('22:00'),
    });
    

    const [textfieldError, setTextfieldError] = useState({
        [LOCATION_NAME]: false,
        [ADDRESS]: false,
        [POSTAL_CODE]: false,
        [MONDAY_IS_OPEN]: false,
        [TUESDAY_IS_OPEN]: false,
        [WEDNESDAY_IS_OPEN]: false,
        [THURSDAY_IS_OPEN]: false,
        [FRIDAY_IS_OPEN]: false,
        [SATURDAY_IS_OPEN]: false,
        [SUNDAY_IS_OPEN]: false,
    });

    const [helperText, setHelperText] = useState({
        [LOCATION_NAME]: '',
        [ADDRESS]: '',
        [POSTAL_CODE]: '',
        [MONDAY_IS_OPEN]: '',
        [TUESDAY_IS_OPEN]: '',
        [WEDNESDAY_IS_OPEN]: '',
        [THURSDAY_IS_OPEN]: '',
        [FRIDAY_IS_OPEN]: '',
        [SATURDAY_IS_OPEN]: '',
        [SUNDAY_IS_OPEN]: '',
    });

    useEffect(() => {
        if (selectedLocation) {
            // Find the location object by id
            const locationObj = locations.find(
                loc => loc.id === (typeof selectedLocation === 'string' ? selectedLocation : selectedLocation.id)
            );
            if (locationObj) {
                const getTime = (isOpen, start, end) => {
                    return {
                        start: isOpen
                            ? dayjs.tz(`2024-01-01 ${start}`, 'YYYY-MM-DD hh:mm A', 'Asia/Singapore')
                            : dayjs.tz('2024-01-01 08:00 AM', 'YYYY-MM-DD hh:mm A', 'Asia/Singapore'),
                        end: isOpen
                            ? dayjs.tz(`2024-01-01 ${end}`, 'YYYY-MM-DD hh:mm A', 'Asia/Singapore')
                            : dayjs.tz('2024-01-01 08:00 PM', 'YYYY-MM-DD hh:mm A', 'Asia/Singapore'),
                    };
                };
                setEnteredValues({
                    locationName: locationObj.locationName,
                    address: locationObj.address,
                    postalCode: locationObj.postalCode,
                    mondayIsOpen: locationObj.operatingHours.monday.isOpen,
                    ...(() => {
                        const {start, end} = getTime(locationObj.operatingHours.monday.isOpen, locationObj.operatingHours.monday.start, locationObj.operatingHours.monday.end);
                        return { mondayStart: start, mondayEnd: end };
                    })(),
                    tuesdayIsOpen: locationObj.operatingHours.tuesday.isOpen,
                    ...(() => {
                        const {start, end} = getTime(locationObj.operatingHours.tuesday.isOpen, locationObj.operatingHours.tuesday.start, locationObj.operatingHours.tuesday.end);
                        return { tuesdayStart: start, tuesdayEnd: end };
                    })(),
                    wednesdayIsOpen: locationObj.operatingHours.wednesday.isOpen,
                    ...(() => {
                        const {start, end} = getTime(locationObj.operatingHours.wednesday.isOpen, locationObj.operatingHours.wednesday.start, locationObj.operatingHours.wednesday.end);
                        return { wednesdayStart: start, wednesdayEnd: end };
                    })(),
                    thursdayIsOpen: locationObj.operatingHours.thursday.isOpen,
                    ...(() => {
                        const {start, end} = getTime(locationObj.operatingHours.thursday.isOpen, locationObj.operatingHours.thursday.start, locationObj.operatingHours.thursday.end);
                        return { thursdayStart: start, thursdayEnd: end };
                    })(),
                    fridayIsOpen: locationObj.operatingHours.friday.isOpen,
                    ...(() => {
                        const {start, end} = getTime(locationObj.operatingHours.friday.isOpen, locationObj.operatingHours.friday.start, locationObj.operatingHours.friday.end);
                        return { fridayStart: start, fridayEnd: end };
                    })(),
                    saturdayIsOpen: locationObj.operatingHours.saturday.isOpen,
                    ...(() => {
                        const {start, end} = getTime(locationObj.operatingHours.saturday.isOpen, locationObj.operatingHours.saturday.start, locationObj.operatingHours.saturday.end);
                        return { saturdayStart: start, saturdayEnd: end };
                    })(),
                    sundayIsOpen: locationObj.operatingHours.sunday.isOpen,
                    ...(() => {
                        const {start, end} = getTime(locationObj.operatingHours.sunday.isOpen, locationObj.operatingHours.sunday.start, locationObj.operatingHours.sunday.end);
                        return { sundayStart: start, sundayEnd: end };
                    })(),
                });
            }
        }
        // eslint-disable-next-line
    }, [selectedLocation, locations]);

    const inputChangeHandler = (key, value) => {
        // setIsSubmissionSuccess(false);
        // setIsBtnDisabled(false);
        setEnteredValues((prevValues) => ({
            ...prevValues,
            [key]: value
        }))
    };

    const resetFormToDefaults = () => {
        setEnteredValues({
            [LOCATION_NAME]: '',
            [ADDRESS]: '',
            [POSTAL_CODE]: '',
            [MONDAY_IS_OPEN]: true,
            [MONDAY_START]: sgtTime('08:00'),
            [MONDAY_END]: sgtTime('22:00'),
            [TUESDAY_IS_OPEN]: true,
            [TUESDAY_START]: sgtTime('08:00'),
            [TUESDAY_END]: sgtTime('22:00'),
            [WEDNESDAY_IS_OPEN]: true,
            [WEDNESDAY_START]: sgtTime('08:00'),
            [WEDNESDAY_END]: sgtTime('22:00'),
            [THURSDAY_IS_OPEN]: true,
            [THURSDAY_START]: sgtTime('08:00'),
            [THURSDAY_END]: sgtTime('22:00'),
            [FRIDAY_IS_OPEN]: true,
            [FRIDAY_START]: sgtTime('08:00'),
            [FRIDAY_END]: sgtTime('22:00'),
            [SATURDAY_IS_OPEN]: true,
            [SATURDAY_START]: sgtTime('08:00'),
            [SATURDAY_END]: sgtTime('22:00'),
            [SUNDAY_IS_OPEN]: true,
            [SUNDAY_START]: sgtTime('08:00'),
            [SUNDAY_END]: sgtTime('22:00'),
        });
        setTextfieldError({
            [LOCATION_NAME]: false,
            [ADDRESS]: false,
            [POSTAL_CODE]: false,
            [MONDAY_IS_OPEN]: false,
            [TUESDAY_IS_OPEN]: false,
            [WEDNESDAY_IS_OPEN]: false,
            [THURSDAY_IS_OPEN]: false,
            [FRIDAY_IS_OPEN]: false,
            [SATURDAY_IS_OPEN]: false,
            [SUNDAY_IS_OPEN]: false,
        });
        setHelperText({
            [LOCATION_NAME]: '',
            [ADDRESS]: '',
            [POSTAL_CODE]: '',
            [MONDAY_IS_OPEN]: '',
            [TUESDAY_IS_OPEN]: '',
            [WEDNESDAY_IS_OPEN]: '',
            [THURSDAY_IS_OPEN]: '',
            [FRIDAY_IS_OPEN]: '',
            [SATURDAY_IS_OPEN]: '',
            [SUNDAY_IS_OPEN]: '',
        });
    };

    const formSubmissionHandler = async (event) => {
        event.preventDefault();
        const transformedData = transformValues(enteredValues);

        if (selectedLocation) {
            // Modify existing location
            setLocations((prevLocations) =>
                prevLocations.map((loc) =>
                    loc.id === (typeof selectedLocation === 'string' ? selectedLocation : selectedLocation.id)
                        ? transformedData
                        : loc
                )
            );
        } else {
            // Add new location
            setLocations((prevLocations) => [...prevLocations, transformedData]);
            // Reset form fields to default values after adding a location
            resetFormToDefaults();
        }

        resetSaving();
        closeAddLocationHandler();
    };

    const formatSGT = (time) => time.tz('Asia/Singapore').format('hh:mm A');

    const transformValues = (values) => {
        const uniqueId = crypto.randomUUID()
        const result = {
            id: `${uniqueId}`,
            locationName: values.locationName,
            address: values.address,
            postalCode: values.postalCode,
            operatingHours: {
                monday: {
                    isOpen: values.mondayIsOpen,
                    start: values.mondayIsOpen ? formatSGT(values.mondayStart) : sgtTime('00:00'),
                    end: values.mondayIsOpen ? formatSGT(values.mondayEnd) : sgtTime('00:00'),
                },
                tuesday: {
                    isOpen: values.tuesdayIsOpen,
                    start: values.tuesdayIsOpen ? formatSGT(values.tuesdayStart) : sgtTime('00:00'),
                    end: values.tuesdayIsOpen ? formatSGT(values.tuesdayEnd) : sgtTime('00:00'),
                },
                wednesday: {
                    isOpen: values.wednesdayIsOpen,
                    start: values.wednesdayIsOpen ? formatSGT(values.wednesdayStart) : sgtTime('00:00'),
                    end: values.wednesdayIsOpen ? formatSGT(values.wednesdayEnd) : sgtTime('00:00'),
                },
                thursday: {
                    isOpen: values.thursdayIsOpen,
                    start: values.thursdayIsOpen ? formatSGT(values.thursdayStart) : sgtTime('00:00'),
                    end: values.thursdayIsOpen ? formatSGT(values.thursdayEnd) : sgtTime('00:00'),
                },
                friday: {
                    isOpen: values.fridayIsOpen,
                    start: values.fridayIsOpen ? formatSGT(values.fridayStart) : sgtTime('00:00'),
                    end: values.fridayIsOpen ? formatSGT(values.fridayEnd) : sgtTime('00:00'),
                },
                saturday: {
                    isOpen: values.saturdayIsOpen,
                    start: values.saturdayIsOpen ? formatSGT(values.saturdayStart) : sgtTime('00:00'),
                    end: values.saturdayIsOpen ? formatSGT(values.saturdayEnd) : sgtTime('00:00'),
                },
                sunday: {
                    isOpen: values.sundayIsOpen,
                    start: values.sundayIsOpen ? formatSGT(values.sundayStart) : sgtTime('00:00'),
                    end: values.sundayIsOpen ? formatSGT(values.sundayEnd) : sgtTime('00:00'),
                },
            }
        };
    
        return result;
    };
    
    return (
        <Backdrop
            onClick={closeAddLocationHandler}
            open={isAddLocationOpen}
            className={styles.backdrop}
        >
            <form
                className={styles.addLocationSidebar}
                onClick={(event) => event.stopPropagation()}
                onSubmit={formSubmissionHandler}
            >
                <IoCloseSharp
                    className={styles.closeIcon}
                    onClick={closeAddLocationHandler}
                />

                <div className={styles.contents}>
                    <div className={styles.contentSection}>
                        <p className={styles.headerP}>Location Name</p>

                        <TextField
                            name="ahop-location-name"
                            variant='outlined'
                            placeholder='Ang Mo Kio Hub'
                            fullWidth
                            helperText={helperText.locationName}
                            value={enteredValues.locationName}
                            error={textfieldError.locationName}
                            disabled={!isEdit}
                            onChange={(event) => { inputChangeHandler(LOCATION_NAME, event.target.value) }}
                        />
                    </div>

                    <div className={styles.contentSection}>
                        <p className={styles.headerP}>Address</p>

                        <TextField
                            name="street-address"
                            autoComplete="street-address"
                            variant='outlined'
                            placeholder='53 Ang Mo Kio Ave 3, #01-09/10'
                            fullWidth
                            type="text"
                            helperText={helperText.address}
                            value={enteredValues.address}
                            error={textfieldError.address}
                            disabled={!isEdit}
                            onChange={(event) => { inputChangeHandler(ADDRESS, event.target.value) }}
                        />
                    </div>

                    <div className={styles.contentSection}>
                        <p className={styles.headerP}>Postal Code</p>

                        <TextField
                            name="postal-code"
                            autoComplete="postal-code"
                            variant='outlined'
                            placeholder='569933'
                            type='number'
                            fullWidth
                            helperText={helperText.postalCode}
                            value={enteredValues.postalCode}
                            error={textfieldError.postalCode}
                            disabled={!isEdit}
                            onChange={(event) => { inputChangeHandler(POSTAL_CODE, event.target.value) }}
                        />
                    </div>

                    <div className={styles.contentSection}>
                        <p className={styles.headerP}>Opening Hours</p>

                        <OpeningHoursInput
                            dayLabel='Monday'
                            isOpen={enteredValues.mondayIsOpen}
                            onToggleOpen={(event) => {
                                inputChangeHandler(MONDAY_IS_OPEN, event.target.checked)
                            }}
                            openTime={enteredValues.mondayStart}
                            closeTime={enteredValues.mondayEnd}
                            onOpenTimeChange={(time) => { inputChangeHandler(MONDAY_START, time) }}
                            onCloseTimeChange={(time) => { inputChangeHandler(MONDAY_END, time) }}
                            disabled={!isEdit}
                        />

                        <OpeningHoursInput
                            dayLabel='Tuesday'
                            isOpen={enteredValues.tuesdayIsOpen}
                            onToggleOpen={(event) => {
                                inputChangeHandler(TUESDAY_IS_OPEN, event.target.checked)
                            }}
                            openTime={enteredValues.tuesdayStart}
                            closeTime={enteredValues.tuesdayEnd}
                            onOpenTimeChange={(time) => { inputChangeHandler(TUESDAY_START, time) }}
                            onCloseTimeChange={(time) => { inputChangeHandler(TUESDAY_END, time) }}
                            disabled={!isEdit}
                        />

                        <OpeningHoursInput
                            dayLabel='Wednesday'
                            isOpen={enteredValues.wednesdayIsOpen}
                            onToggleOpen={(event) => {
                                inputChangeHandler(WEDNESDAY_IS_OPEN, event.target.checked)
                            }}
                            openTime={enteredValues.wednesdayStart}
                            closeTime={enteredValues.wednesdayEnd}
                            onOpenTimeChange={(time) => { inputChangeHandler(WEDNESDAY_START, time) }}
                            onCloseTimeChange={(time) => { inputChangeHandler(WEDNESDAY_END, time) }}
                            disabled={!isEdit}
                        />

                        <OpeningHoursInput
                            dayLabel='Thursday'
                            isOpen={enteredValues.thursdayIsOpen}
                            onToggleOpen={(event) => {
                                inputChangeHandler(THURSDAY_IS_OPEN, event.target.checked)
                            }}
                            openTime={enteredValues.thursdayStart}
                            closeTime={enteredValues.thursdayEnd}
                            onOpenTimeChange={(time) => { inputChangeHandler(THURSDAY_START, time) }}
                            onCloseTimeChange={(time) => { inputChangeHandler(THURSDAY_END, time) }}
                            disabled={!isEdit}
                        />

                        <OpeningHoursInput
                            dayLabel='Friday'
                            isOpen={enteredValues.fridayIsOpen}
                            onToggleOpen={(event) => {
                                inputChangeHandler(FRIDAY_IS_OPEN, event.target.checked)
                            }}
                            openTime={enteredValues.fridayStart}
                            closeTime={enteredValues.fridayEnd}
                            onOpenTimeChange={(time) => { inputChangeHandler(FRIDAY_START, time) }}
                            onCloseTimeChange={(time) => { inputChangeHandler(FRIDAY_END, time) }}
                            disabled={!isEdit}
                        />

                        <OpeningHoursInput
                            dayLabel='Saturday'
                            isOpen={enteredValues.saturdayIsOpen}
                            onToggleOpen={(event) => {
                                inputChangeHandler(SATURDAY_IS_OPEN, event.target.checked)
                            }}
                            openTime={enteredValues.saturdayStart}
                            closeTime={enteredValues.saturdayEnd}
                            onOpenTimeChange={(time) => { inputChangeHandler(SATURDAY_START, time) }}
                            onCloseTimeChange={(time) => { inputChangeHandler(SATURDAY_END, time) }}
                            disabled={!isEdit}
                        />

                        <OpeningHoursInput
                            dayLabel='Sunday'
                            isOpen={enteredValues.sundayIsOpen}
                            onToggleOpen={(event) => {
                                inputChangeHandler(SUNDAY_IS_OPEN, event.target.checked)
                            }}
                            openTime={enteredValues.sundayStart}
                            closeTime={enteredValues.sundayEnd}
                            onOpenTimeChange={(time) => { inputChangeHandler(SUNDAY_START, time) }}
                            onCloseTimeChange={(time) => { inputChangeHandler(SUNDAY_END, time) }}
                            disabled={!isEdit}
                        />
                    </div>
                </div>

                <div className={styles.buttonContainer}>
                    <Button
                        // loading={true}
                        disabled={!isEdit}
                        loadingPosition='start'
                        variant='contained'
                        className={styles.button}
                        fullWidth
                        type='submit'
                    >
                        { selectedLocation ?  'Modify Location' : 'Add Location'}
                    </Button>
                </div>
            </form>
        </Backdrop>
    )
};

export default AddLocationSection;
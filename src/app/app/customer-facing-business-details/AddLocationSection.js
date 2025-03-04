import BasicTimePicker from '@/components/BasicTimePicker/BasicTimePicker';
import styles from './AddLocationSection.module.css';
import { Backdrop, TextField } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import { LoadingButton } from '@mui/lab';

const AddLocationSection = ({
    closeAddLocationHandler,
    isAddLocationOpen
}) => {
    return (
        <Backdrop
            onClick={closeAddLocationHandler}
            open={isAddLocationOpen}
            className={styles.backdrop}
        >
            <div
                className={styles.addLocationSidebar}
                onClick={(event) => event.stopPropagation()}
            >
                <IoCloseSharp
                    className={styles.closeIcon}
                    onClick={closeAddLocationHandler}
                />

                <div className={styles.contents}>
                    <div className={styles.contentSection}>
                        <p className={styles.headerP}>Location Name</p>

                        <TextField
                            variant='outlined'
                            placeholder='Ang Mo Kio Hub'
                            fullWidth
                        />
                    </div>

                    <div className={styles.contentSection}>
                        <p className={styles.headerP}>Address</p>

                        <TextField
                            variant='outlined'
                            placeholder='53 Ang Mo Kio Ave 3, #01-09/10'
                            fullWidth
                        />
                    </div>

                    <div className={styles.contentSection}>
                        <p className={styles.headerP}>Postal Code</p>

                        <TextField
                            variant='outlined'
                            placeholder='569933'
                            type='number'
                            fullWidth
                        />
                    </div>

                    <div className={styles.contentSection}>
                        <p className={styles.headerP}>Opening Hours</p>

                        <div className={styles.subContainer}>
                            <p className={styles.subHeader}>Monday</p>

                            <div className={styles.timePickerContainer}>
                                <div className={styles.timePickSubContainer}>
                                    <p>Opened at</p>
                                    <BasicTimePicker />
                                </div>
                                <div className={styles.timePickSubContainer}>
                                    <p>Closed at</p>
                                    <BasicTimePicker />
                                </div>
                            </div>
                        </div>

                        <div className={styles.subContainer}>
                            <p className={styles.subHeader}>Tuesday</p>

                            <div className={styles.timePickerContainer}>
                                <div className={styles.timePickSubContainer}>
                                    <p>Opened at</p>
                                    <BasicTimePicker />
                                </div>
                                <div className={styles.timePickSubContainer}>
                                    <p>Closed at</p>
                                    <BasicTimePicker />
                                </div>
                            </div>
                        </div>

                        <div className={styles.subContainer}>
                            <p className={styles.subHeader}>Wednesday</p>

                            <div className={styles.timePickerContainer}>
                                <div className={styles.timePickSubContainer}>
                                    <p>Opened at</p>
                                    <BasicTimePicker />
                                </div>
                                <div className={styles.timePickSubContainer}>
                                    <p>Closed at</p>
                                    <BasicTimePicker />
                                </div>
                            </div>
                        </div>

                        <div className={styles.subContainer}>
                            <p className={styles.subHeader}>Thursday</p>

                            <div className={styles.timePickerContainer}>
                                <div className={styles.timePickSubContainer}>
                                    <p>Opened at</p>
                                    <BasicTimePicker />
                                </div>
                                <div className={styles.timePickSubContainer}>
                                    <p>Closed at</p>
                                    <BasicTimePicker />
                                </div>
                            </div>
                        </div>

                        <div className={styles.subContainer}>
                            <p className={styles.subHeader}>Friday</p>

                            <div className={styles.timePickerContainer}>
                                <div className={styles.timePickSubContainer}>
                                    <p>Opened at</p>
                                    <BasicTimePicker />
                                </div>
                                <div className={styles.timePickSubContainer}>
                                    <p>Closed at</p>
                                    <BasicTimePicker />
                                </div>
                            </div>
                        </div>

                        <div className={styles.subContainer}>
                            <p className={styles.subHeader}>Saturday</p>

                            <div className={styles.timePickerContainer}>
                                <div className={styles.timePickSubContainer}>
                                    <p>Opened at</p>
                                    <BasicTimePicker />
                                </div>
                                <div className={styles.timePickSubContainer}>
                                    <p>Closed at</p>
                                    <BasicTimePicker />
                                </div>
                            </div>
                        </div>

                        <div className={styles.subContainer}>
                            <p className={styles.subHeader}>Sunday</p>

                            <div className={styles.timePickerContainer}>
                                <div className={styles.timePickSubContainer}>
                                    <p>Opened at</p>
                                    <BasicTimePicker />
                                </div>
                                <div className={styles.timePickSubContainer}>
                                    <p>Closed at</p>
                                    <BasicTimePicker />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.buttonContainer}>
                    <LoadingButton
                        // onClick={handleClick}
                        // loading={true}
                        // disabled
                        loadingPosition='start'
                        variant='contained'
                        className={styles.button}
                        fullWidth
                    >
                        Add Location
                    </LoadingButton>
                </div>
            </div>
        </Backdrop>
    )
};

export default AddLocationSection;
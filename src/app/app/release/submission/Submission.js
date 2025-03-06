'use client';
import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { useState } from 'react';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import Checklists from './_views/Checklist';
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";



const PUBLISHING_TYPE = 'publishingType';
const NAME = 'name';
const ROLE = 'role';
const PHONE_NUMBER = 'number';

dayjs.extend(localizedFormat);
const tomorrowStart = dayjs().add(1, "day").startOf("day");

const SubmissionView = () => {
    const [isBtnLoading, setIsBtnLoading] = useState(false);
    const [value, setValue] = useState(tomorrowStart);

    const [enteredValues, setEnteredValues] = useState({
        [PUBLISHING_TYPE]: 'auto',
        [NAME]: '',
        [ROLE]: '',
        [PHONE_NUMBER]: '',
    });

    const [textfieldError, setTextfieldError] = useState({

        [PUBLISHING_TYPE]: false,
        [NAME]: false,
        [ROLE]: false,
        [PHONE_NUMBER]: false,
    });

    const [helperText, setHelperText] = useState({
        [PUBLISHING_TYPE]: '',
        [NAME]: '',
        [ROLE]: '',
        [PHONE_NUMBER]: '',
    });

    const inputChangeHandler = (key, value) => {
        // setIsSubmissionSuccess(false);
        // setIsBtnDisabled(false);
        setEnteredValues((prevValues) => ({
            ...prevValues,
            [key]: value
        }))
    };

    const textfieldErrorHandler = (key, value) => {
        setTextfieldError((preValues) => ({
            ...preValues,
            [key]: value
        }))
    };

    const helperTextHandler = (key, value) => {
        setHelperText((preValues) => ({
            ...preValues,
            [key]: value
        }))
    };

    return (
        <form
            className={styles.form}
            onSubmit={() => { }}
        >
            <HeaderSection
                className={styles.header}
                title='Release Submission'
                description={
                    <p>
                        See an overview of your loyalty system and
                        submit for review. It takes 1 - 2
                        working days to get approved. <Link href='/'>Find out more.</Link>
                    </p>
                }
            />

            <ContentCard className={styles.content}>
                <FieldHeader
                    title='Checklists'
                    description='Ensure that all required tasks have been completed before submitting for review. Please fix any issues.'
                />

                <Checklists />
            </ContentCard>

            <ContentCard className={styles.content}>
                <FieldHeader
                    title='Managed publishing'
                    description='To make your release or update avilable on Collbine app, you need to send to Collbine for review. You can automatically release it after it&apos;s been approved by Collbine Reviewer or you can also manually release it on App Store at a later date.'
                />

                <FullWidthDropdown
                    options={[
                        { value: 'manually', title: 'Manually release this version' },
                        { value: 'auto', title: 'Automatically release this version' }
                    ]}
                    labelId='manage_publishing'
                    id='manage_publishing'
                    value={enteredValues.publishingType}
                    onChange={(event) => { inputChangeHandler(PUBLISHING_TYPE, event.target.value) }}
                />
                {
                    enteredValues.publishingType === 'manually' &&
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DateTimePicker
                            label="Select Date & Time"
                            value={value}
                            onChange={(newValue) => setValue(newValue)}
                            format="DD/MM/YYYY hh:mm A"
                            minDate={tomorrowStart}
                            className={styles.datetimePicker}
                        />
                    </LocalizationProvider>

                }

            </ContentCard>

            <ContentCard className={styles.content}>
                <div>
                    <FieldHeader
                        title='Representative Contact Details'
                    />

                    <FormTextField
                        title='Name*'
                        placeholder='Your name'
                        id={NAME}
                        name={NAME}
                        helperText={helperText.name}
                        error={textfieldError.name}
                        value={enteredValues.name}
                        disabled={isBtnLoading}
                        onChange={(event) => { inputChangeHandler(NAME, event.target.value) }}
                    />
                </div>

                <FormTextField
                    title='Role*'
                    placeholder='Accounts Manager'
                    id={ROLE}
                    name={ROLE}
                    helperText={helperText.role}
                    error={textfieldError.role}
                    value={enteredValues.role}
                    disabled={isBtnLoading}
                    onChange={(event) => { inputChangeHandler(ROLE, event.target.value) }}
                />

                <FormTextField
                    title='Phone Number*'
                    placeholder='+6591234567'
                    id={PHONE_NUMBER}
                    name={PHONE_NUMBER}
                    type='tel'
                    helperText={helperText.phoneNumber}
                    error={textfieldError.phoneNumber}
                    value={enteredValues.phoneNumber}
                    disabled={isBtnLoading}
                    onChange={(event) => { inputChangeHandler(PHONE_NUMBER, event.target.value) }}
                />
            </ContentCard>

        </form>
    )
};

export default SubmissionView;
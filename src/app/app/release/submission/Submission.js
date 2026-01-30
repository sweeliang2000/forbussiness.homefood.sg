'use client';
import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { useState, useEffect } from 'react';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import Checklists from './_views/Checklist';
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import apiClient from '@/utility/api';
import { CHECKLIST_STATUS, RELEASE_STATUS, RELEASE_CONTACT, SEND_FOR_REVIEW, CANCEL_RELEASE } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import AlertModal from '@/components/AlertModal/AlertModal';



const PUBLISHING_TYPE = 'publishingType';
const NAME = 'name';
const ROLE = 'role';
const EMAIL = 'email';
const PHONE_NUMBER = 'number';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
const defaultStartDate = dayjs().add(2, "day").startOf("day");

const SubmissionView = () => {
    const [isBtnLoading, setIsBtnLoading] = useState(true);
    const [value, setValue] = useState(defaultStartDate);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);
    const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [datetimeError, setDatetimeError] = useState(false);
    const [releaseStatus, setReleaseStatus] = useState(null);
    const [sentDateTime, setSentDateTime] = useState(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [checklistStatus, setChecklistStatus] = useState({
        businessHasAllRequiredField: false,
        customerHasAllRequiredField: false,
        stampHasAllRequiredField: false,
        qrCodeHasAllRequiredField: false,
        thirdRequirementMet: false,
    });

    const [enteredValues, setEnteredValues] = useState({
        [PUBLISHING_TYPE]: 'auto',
        [NAME]: '',
        [ROLE]: '',
        [EMAIL]: '',
        [PHONE_NUMBER]: '',
    });

    const [textfieldError, setTextfieldError] = useState({

        [PUBLISHING_TYPE]: false,
        [NAME]: false,
        [ROLE]: false,
        [EMAIL]: false,
        [PHONE_NUMBER]: false,
    });

    const [helperText, setHelperText] = useState({
        [PUBLISHING_TYPE]: '',
        [NAME]: '',
        [ROLE]: '',
        [EMAIL]: '',
        [PHONE_NUMBER]: '',
    });

    const inputChangeHandler = (key, value) => {
        setIsSubmissionSuccess(false);
        setIsError(false);
        setErrorMessage('');
        setEnteredValues((prevValues) => ({
            ...prevValues,
            [key]: value
        }))
        // Clear error for this field when user starts typing
        if (textfieldError[key]) {
            textfieldErrorHandler(key, false);
            helperTextHandler(key, '');
        }
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

    const validateForm = () => {
        let isValid = true;
        const validationErrors = [];

        // Clear previous errors
        const newErrors = { ...textfieldError };
        const newHelperTexts = { ...helperText };

        // Validate Name
        if (!enteredValues.name || enteredValues.name.trim() === '') {
            newErrors[NAME] = true;
            newHelperTexts[NAME] = 'Name is required';
            validationErrors.push('Name is required');
            isValid = false;
        } else {
            newErrors[NAME] = false;
            newHelperTexts[NAME] = '';
        }

        // Validate Role
        if (!enteredValues.role || enteredValues.role.trim() === '') {
            newErrors[ROLE] = true;
            newHelperTexts[ROLE] = 'Role is required';
            validationErrors.push('Role is required');
            isValid = false;
        } else {
            newErrors[ROLE] = false;
            newHelperTexts[ROLE] = '';
        }

        // Validate Email
        if (!enteredValues.email || enteredValues.email.trim() === '') {
            newErrors[EMAIL] = true;
            newHelperTexts[EMAIL] = 'Email address is required';
            validationErrors.push('Email address is required');
            isValid = false;
        } else {
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(enteredValues.email.trim())) {
                newErrors[EMAIL] = true;
                newHelperTexts[EMAIL] = 'Please enter a valid email address';
                validationErrors.push('Please enter a valid email address');
                isValid = false;
            } else {
                newErrors[EMAIL] = false;
                newHelperTexts[EMAIL] = '';
            }
        }

        // Validate scheduled release datetime
        if (enteredValues.publishingType === 'scheduled') {
            if (!value || !value.isValid()) {
                setDatetimeError(true);
                const datetimeErrorMsg = 'Please select a date and time for scheduled release';
                validationErrors.push(datetimeErrorMsg);
                setErrorMessage(datetimeErrorMsg);
                isValid = false;
            } else {
                setDatetimeError(false);
            }
        } else {
            setDatetimeError(false);
        }

        setTextfieldError(newErrors);
        setHelperText(newHelperTexts);

        // Show error in header if validation failed
        if (!isValid) {
            const errorMsg = validationErrors.length > 0 
                ? `Please fix the following errors: ${validationErrors.join(', ')}`
                : 'Please fill in all required fields';
            showError(errorMsg);
        } else {
            setErrorMessage('');
        }

        return isValid;
    };

    const showError = (message) => {
        setIsError(true);
        setErrorMessage(message);
    };

    const clearError = () => {
        setIsError(false);
        setErrorMessage('');
    };

    const formSubmissionHandler = async (event) => {
        event.preventDefault();
        console.log('formSubmissionHandler');
        if (!validateForm()) {
            return;
        }

        setIsBtnLoading(true);
        clearError();

        try {
            // Build payload - always use "immediate" as release_type
            // The presence of release_datetime indicates scheduled release
            const payload = {
                release_type: 'immediate',
                contact_details_name: enteredValues.name.trim(),
                contact_details_role: enteredValues.role.trim(),
                contact_details_email: enteredValues.email.trim(),
            };

            // Add phone number if provided
            if (enteredValues.phoneNumber && enteredValues.phoneNumber.trim() !== '') {
                payload.contact_details_phone_number = enteredValues.phoneNumber.trim();
            }

            // Add release_datetime if scheduled (in GST +8)
            if (enteredValues.publishingType === 'scheduled' && value && value.isValid()) {
                // Convert to Asia/Singapore timezone (GST +8) and format as ISO string
                const gstDateTime = value.tz('Asia/Singapore').format('YYYY-MM-DDTHH:mm:ss[+08:00]');
                payload.release_datetime = gstDateTime;
            }

            await apiClient.post(SEND_FOR_REVIEW, payload);

            // Refresh the page after successful submission
            window.location.reload();
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            showError(`An error had occurred. ${message} (Error code: ${code}). Please try again.`);
            setIsBtnLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        setIsBtnLoading(true);

        const fetchData = async () => {
            try {
                // Fetch checklist status, release status, and release contact data in parallel
                const [checklistResponse, releaseStatusResponse, releaseContactResponse] = await Promise.all([
                    apiClient.get(CHECKLIST_STATUS),
                    apiClient.get(RELEASE_STATUS),
                    apiClient.get(RELEASE_CONTACT).catch(() => null) // Make it optional - don't fail if it doesn't exist
                ]);

                // Process checklist status
                const checklistData = checklistResponse.data;
                if (checklistData && checklistData.data) {
                    console.log('checklistData:', checklistData);
                    setChecklistStatus({
                        businessHasAllRequiredField: checklistData.data.businessHasAllRequiredField || false,
                        customerHasAllRequiredField: checklistData.data.customerHasAllRequiredField || false,
                        stampHasAllRequiredField: checklistData.data.stampHasAllRequiredField || false,
                        qrCodeHasAllRequiredField: checklistData.data.qrCodeHasAllRequiredField || false,
                        thirdRequirementMet: checklistData.data.thirdRequirementMet || false,
                    });
                }

                // Process release status
                const releaseData = releaseStatusResponse.data;
                if (releaseData && releaseData.data) {
                    console.log('releaseData:', releaseData);
                    setReleaseStatus(releaseData.data.status);
                    
                    // Extract and convert sentdatetime from UTC to SGT
                    if (releaseData.data.sentdatetime) {
                        // Parse UTC datetime and convert to SGT (Asia/Singapore)
                        const utcDateTime = dayjs.utc(releaseData.data.sentdatetime);
                        const sgtDateTime = utcDateTime.tz('Asia/Singapore');
                        setSentDateTime(sgtDateTime);
                    }
                    
                    if (releaseData.data.status === 'pending') {
                        setIsSubmissionSuccess(true);
                    }
                }

                // Process release contact data and populate form fields
                if (releaseContactResponse && releaseContactResponse.data && releaseContactResponse.data.data) {
                    const contactData = releaseContactResponse.data.data;
                    console.log('contactData:', contactData);
                    // Determine publishing type based on release_type and release_datetime
                    let publishingType = 'auto'; // default
                    if (contactData.release_datetime) {
                        publishingType = 'scheduled';
                    } else if (contactData.release_type === 'immediate') {
                        // Could be 'auto' or 'manually', default to 'auto'
                        publishingType = 'auto';
                    }
                    
                    // Populate all form fields in a single update
                    setEnteredValues({
                        [PUBLISHING_TYPE]: publishingType,
                        [NAME]: contactData.contact_details_name || '',
                        [ROLE]: contactData.contact_details_role || '',
                        [EMAIL]: contactData.contact_details_email || '',
                        [PHONE_NUMBER]: contactData.contact_details_phone_number || '',
                    });

                    // Handle datetime if it's a scheduled release
                    if (contactData.release_datetime) {
                        // Parse the datetime string (format: "2025-11-06T00:00:00+08:00")
                        const parsedDateTime = dayjs(contactData.release_datetime);
                        if (parsedDateTime.isValid()) {
                            setValue(parsedDateTime);
                        }
                    }
                }

                setIsLoading(false);
                setIsBtnLoading(false);
            } catch (error) {
                const errorData = error?.response?.data;
                const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
                const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
                setIsLoading(false);
                setIsBtnLoading(false);
                setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code}). Please try to refresh the page.`);
            }
        };

        fetchData();
    }, []);

    const handleCancel = () => {
        setShowCancelDialog(true);
    };

    const handleCancelConfirm = async () => {
        setIsCanceling(true);
        try {
            await apiClient.delete(CANCEL_RELEASE);
            // Refresh the page or refetch release status to update UI
            window.location.reload();
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            showError(`An error had occurred. ${message} (Error code: ${code}). Please try again.`);
            setShowCancelDialog(false);
            setIsCanceling(false);
        }
    };

    const handleCancelDialogClose = () => {
        if (!isCanceling) {
            setShowCancelDialog(false);
        }
    };

    const isPending = releaseStatus === 'pending';
    const isRejected = releaseStatus === 'reject';
    const isReleased = releaseStatus === 'Released';

    // Generate success message for released status
    const getReleasedSuccessMessage = () => {
        if (!isReleased) return null;
        
        if (sentDateTime) {
            const formattedDate = sentDateTime.format('DD MMM YYYY, hh:mm A');
            return `Your release that was sent on ${formattedDate} is already live. Feel free to make any changes and submit a new release.`;
        }
        
        return 'Your release is already live. Feel free to make any changes and submit a new release.';
    };

    // Generate info message with sent datetime if available
    const getInfoMessage = () => {
        if (!isPending) return null;
        
        const viewDetailsLink = <Link href="/app/release/status" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>View details</Link>;
        
        if (sentDateTime) {
            const formattedDate = sentDateTime.format('DD MMM YYYY, hh:mm A');
            return (
                <>
                    Your review submitted on {formattedDate} has been received and we are reviewing it. It will take 1 to 2 working days to get approved. Please wait or email to support@collbine.com if there are any questions. {viewDetailsLink}
                </>
            );
        }
        
        return (
            <>
                Your release had been sent to the reviewer and it will take 1 to 2 working days to get approved. Please wait or email to support@collbine.com if there are any questions. {viewDetailsLink}
            </>
        );
    };

    // Generate error message for rejected status
    const getRejectErrorMessage = () => {
        if (!isRejected) return null;
        
        const viewDetailsLink = <Link href="/app/release/status" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>View details</Link>;
        
        if (sentDateTime) {
            const formattedDate = sentDateTime.format('DD MMM YYYY, hh:mm A');
            return (
                <>
                    Your review submitted on {formattedDate} has been rejected. Please review the feedback and resubmit. {viewDetailsLink}
                </>
            );
        }
        
        return (
            <>
                Your review has been rejected. Please review the feedback and resubmit. {viewDetailsLink}
            </>
        );
    };

    return (
        <form
            className={styles.form}
            onSubmit={formSubmissionHandler}
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
                loading={isBtnLoading}
                isSuccess={isSubmissionSuccess}
                setShowError={isRejected ? () => {} : setIsError}
                isError={isRejected ? true : isError}
                errorMessage={isRejected ? getRejectErrorMessage() : errorMessage}
                successMessage={getReleasedSuccessMessage()}
                isDisabled={isPending}
                infoMessage={getInfoMessage()}
                showCancelButton={isPending}
                onCancel={handleCancel}
                buttonText='Send'
                successButtonText='Sent'
            />

            {
                isLoading ? 
                <LoadingPage/> :
                isLoadingErrorMessage !== null ? 
                <ErrorPage message={isLoadingErrorMessage} /> :
                <>
                    <ContentCard className={styles.content}>
                        <FieldHeader
                            title='Checklists'
                            description='Ensure that all required tasks have been completed before submitting for review. Please fix any issues.'
                        />

                        <Checklists checklistStatus={checklistStatus} />
                    </ContentCard>
                </>
            }

            {!isLoading && isLoadingErrorMessage === null && (
            <>
            <ContentCard className={styles.content}>
                <FieldHeader
                    title='Managed publishing'
                    description='To make your release or update avilable on Collbine app, you need to send to Collbine for review. You can automatically release it after it&apos;s been approved by Collbine Reviewer or you can also manually release it on App Store at a later date.'
                />

                <FullWidthDropdown
                    options={[
                        { value: 'auto', title: 'Automatically release this version' },
                        { value: 'manually', title: 'Manually release this version' },
                        { value: 'scheduled', title: 'Schedule release this version for a later date' }
                    ]}
                    labelId='manage_publishing'
                    id='manage_publishing'
                    value={enteredValues.publishingType}
                    disabled={isPending || isRejected || isReleased || isBtnLoading}
                    onChange={(event) => {
                        inputChangeHandler(PUBLISHING_TYPE, event.target.value);
                        // Clear datetime error when switching away from scheduled
                        if (event.target.value !== 'scheduled') {
                            setDatetimeError(false);
                        }
                    }}
                />
                {
                    enteredValues.publishingType === 'scheduled' &&
                    <>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DateTimePicker
                                label="Select Date & Time"
                                value={value}
                                onChange={(newValue) => {
                                    setValue(newValue);
                                    setDatetimeError(false);
                                    setErrorMessage('');
                                }}
                                format="DD/MM/YYYY hh:mm A"
                                minDate={defaultStartDate}
                                disabled={isPending || isRejected || isReleased || isBtnLoading}
                                className={styles.datetimePicker}
                                slotProps={{
                                    textField: {
                                        error: datetimeError,
                                        helperText: datetimeError ? 'Please select a date and time for scheduled release' : ''
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </>

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
                        disabled={isPending || isRejected || isReleased || isBtnLoading}
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
                        disabled={isPending || isRejected || isReleased || isBtnLoading}
                        onChange={(event) => { inputChangeHandler(ROLE, event.target.value) }}
                />

                <FormTextField
                    title='Email Address*'
                    placeholder='your.email@example.com'
                    id={EMAIL}
                    name={EMAIL}
                    type='email'
                    helperText={helperText.email}
                    error={textfieldError.email}
                        value={enteredValues.email}
                        disabled={isPending || isRejected || isReleased || isBtnLoading}
                        onChange={(event) => { inputChangeHandler(EMAIL, event.target.value) }}
                />

                <FormTextField
                    title='Phone Number'
                    placeholder='+6591234567'
                    id={PHONE_NUMBER}
                    name={PHONE_NUMBER}
                    type='tel'
                    helperText={helperText.phoneNumber}
                    error={textfieldError.phoneNumber}
                        value={enteredValues.phoneNumber}
                        disabled={isPending || isRejected || isReleased || isBtnLoading}
                        onChange={(event) => { inputChangeHandler(PHONE_NUMBER, event.target.value) }}
                />
            </ContentCard>
            </>
            )}

            <AlertModal
                open={showCancelDialog}
                onClose={handleCancelDialogClose}
                title="Cancel Review"
                description={
                    <div>
                        <p style={{ marginBottom: '16px' }}>
                            Are you sure you want to cancel the review?
                        </p>
                        <p style={{ marginBottom: '16px' }}>
                            Canceling will delay your release and you will need to resubmit for review again.
                        </p>
                        <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>
                            This action cannot be undone.
                        </p>
                    </div>
                }
                onAction={handleCancelConfirm}
                actionButtonText={isCanceling ? 'Canceling...' : 'Cancel Review'}
                type="error"
                showActionButton={true}
            />
        </form>
    )
};

export default SubmissionView;
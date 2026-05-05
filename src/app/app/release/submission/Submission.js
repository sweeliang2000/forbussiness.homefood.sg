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
import { CHECKLIST_STATUS, RELEASE_STATUS, RELEASE_CONTACT, SEND_FOR_REVIEW, CANCEL_RELEASE, CANCEL_SCHEDULED_RELEASE } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import AlertModal from '@/components/AlertModal/AlertModal';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import { getSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { SUBSCRIPTION_DATA } from '@/app/app/subscription/data/SUBSCRIPTION_DATA';



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
    const [isUserSubscribed, setIsUserSubscribed] = useState(false);
    const [isBtnLoading, setIsBtnLoading] = useState(true);
    const [value, setValue] = useState(defaultStartDate);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);
    const [isLoadingErrorStatus, setIsLoadingErrorStatus] = useState(null);
    const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [datetimeError, setDatetimeError] = useState(false);
    const [releaseStatus, setReleaseStatus] = useState(null);
    const [sentDateTime, setSentDateTime] = useState(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelConfirmText, setCancelConfirmText] = useState('');
    const [showCancelSuccessPopup, setShowCancelSuccessPopup] = useState(false);
    const [checklistStatus, setChecklistStatus] = useState({
        businessHasAllRequiredField: false,
        customerHasAllRequiredField: false,
        orderSettingsReady: false,
        menuSettingReady: false,
        stripeConnectReady: false,
        thirdRequirementMet: false,
    });

    const [enteredValues, setEnteredValues] = useState({
        [PUBLISHING_TYPE]: 'immediate',
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
        if (enteredValues.publishingType === 'schedule') {
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
            // Build payload - use the publishing type selected by the user (immediate or schedule)
            const payload = {
                release_type: enteredValues.publishingType || 'immediate',
                contact_details_name: enteredValues.name.trim(),
                contact_details_role: enteredValues.role.trim(),
                contact_details_email: enteredValues.email.trim(),
            };

            // Add phone number if provided
            if (enteredValues.phoneNumber && enteredValues.phoneNumber.trim() !== '') {
                payload.contact_details_phone_number = enteredValues.phoneNumber.trim();
            }

            // Add release_datetime if schedule (in GST +8)
            if (enteredValues.publishingType === 'schedule' && value && value.isValid()) {
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

    const refetchReleaseData = async () => {
        setIsLoading(true);
        setIsBtnLoading(true);
        try {
            const [checklistResponse, releaseStatusResponse, releaseContactResponse] = await Promise.all([
                apiClient.get(CHECKLIST_STATUS),
                apiClient.get(RELEASE_STATUS),
                apiClient.get(RELEASE_CONTACT).catch(() => null)
            ]);

            const checklistData = checklistResponse.data;
            if (checklistData?.data) {
                const orderSettingsReady = checklistData.data.orderSettingsReady || false;
                const menuSettingReady = checklistData.data.menuSettingReady || false;
                const stripeConnectReady = checklistData.data.stripeConnectReady || false;
                setChecklistStatus({
                    businessHasAllRequiredField: checklistData.data.businessHasAllRequiredField || false,
                    customerHasAllRequiredField: checklistData.data.customerHasAllRequiredField || false,
                    orderSettingsReady,
                    menuSettingReady,
                    stripeConnectReady,
                    thirdRequirementMet: orderSettingsReady && menuSettingReady && stripeConnectReady,
                });
            }

            const releaseData = releaseStatusResponse.data;
            if (releaseData?.data) {
                setReleaseStatus(releaseData.data.status);
                if (releaseData.data.sentdatetime) {
                    const utcDateTime = dayjs.utc(releaseData.data.sentdatetime);
                    setSentDateTime(utcDateTime.tz('Asia/Singapore'));
                }
                if (releaseData.data.status === 'pending') {
                    setIsSubmissionSuccess(true);
                }
            }

            if (releaseContactResponse?.data?.data) {
                const contactData = releaseContactResponse.data.data;
                let publishingType = contactData.release_datetime ? 'schedule' : (contactData.release_type === 'immediate' ? 'immediate' : 'immediate');
                setEnteredValues({
                    [PUBLISHING_TYPE]: publishingType,
                    [NAME]: contactData.contact_details_name || '',
                    [ROLE]: contactData.contact_details_role || '',
                    [EMAIL]: contactData.contact_details_email || '',
                    [PHONE_NUMBER]: contactData.contact_details_phone_number || '',
                });
                if (contactData.release_datetime) {
                    const parsedDateTime = dayjs(contactData.release_datetime);
                    if (parsedDateTime.isValid()) setValue(parsedDateTime);
                }
            }

            setIsLoadingErrorMessage(null);
            setIsLoadingErrorStatus(null);
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code}). Please try to refresh the page.`);
            setIsLoadingErrorStatus(error?.response?.status ?? null);
        } finally {
            setIsLoading(false);
            setIsBtnLoading(false);
        }
    };

    useEffect(() => {
        const storedLookupKey = getSubscriptionLookupKey();
        setIsUserSubscribed(SUBSCRIPTION_DATA.some(plan => plan.lookup_key === storedLookupKey));
        refetchReleaseData();
    }, []);

    const handleCancel = () => {
        setShowCancelDialog(true);
    };

    const handleCancelConfirm = async () => {
        if (isApprovedScheduled && cancelConfirmText.trim().toLowerCase() !== 'confirm') {
            return;
        }
        setIsCanceling(true);
        try {
            const endpoint = isApprovedScheduled ? CANCEL_SCHEDULED_RELEASE : CANCEL_RELEASE;
            console.log('endpoint:', endpoint);
            await apiClient.delete(endpoint);
            setShowCancelDialog(false);
            setCancelConfirmText('');
            setIsCanceling(false);
            setShowCancelSuccessPopup(true);
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
            setCancelConfirmText('');
        }
    };

    const isPending = releaseStatus === 'pending';
    const isRejected = releaseStatus === 'reject';
    const isReleased = releaseStatus === 'Released';
    const isApprovedScheduled = releaseStatus === 'approved_scheduled';

    // Generate success message for approved_scheduled status
    const getApprovedScheduledMessage = () => {
        if (!isApprovedScheduled) return null;
        const formattedDate = value?.isValid?.() ? value.format('DD MMM YYYY, hh:mm A') : sentDateTime?.format?.('DD MMM YYYY, hh:mm A');
        const dateText = formattedDate || 'the scheduled date';
        return (
            <>
                Your release has been approved. It will be released on {dateText}. If you wish to change the date, cancel and re-send for approval. For any enquiry or urgent release, email support@collbine.com
            </>
        );
    };

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
                isSuccess={isSubmissionSuccess || isApprovedScheduled}
                setShowError={isRejected ? () => {} : setIsError}
                isError={isRejected ? true : isError}
                errorMessage={isRejected ? getRejectErrorMessage() : errorMessage}
                successMessage={getApprovedScheduledMessage() || getReleasedSuccessMessage()}
                isDisabled={isPending || isApprovedScheduled || !isUserSubscribed}
                warningMessage={!isUserSubscribed ? <>You need an active subscription to submit a release. <Link href="/app/subscription">Please upgrade your plan.</Link></> : null}
                infoMessage={getInfoMessage()}
                showCancelButton={isPending || isApprovedScheduled}
                cancelButtonText={isApprovedScheduled ? 'Cancel Release' : 'Cancel Review'}
                onCancel={handleCancel}
                buttonText='Send'
                successButtonText='Sent'
            />

            {!isUserSubscribed && (
                <div className={styles.banner}>
                    <div className={styles.bannerContent}>
                        <HiOutlineExclamationCircle className={styles.bannerIcon} />
                        <p className={styles.bannerText}>
                            You will need to purchase in order for you to release to Collbine up.{` `}
                            <Link href="/app/subscription" className={styles.bannerLink}>Upgrade now</Link>
                        </p>
                    </div>
                </div>
            )}

            {
                isLoading ? 
                <LoadingPage/> :
                isLoadingErrorMessage !== null ? 
                <ErrorPage message={isLoadingErrorMessage} statusCode={isLoadingErrorStatus} /> :
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
                        { value: 'immediate', title: 'Automatically release this version. (Once approved, it will be live on Collbine app immediately)' },
                        // { value: 'manually', title: 'Manually release this version' },
                        { value: 'schedule', title: 'Schedule release this version for a later date' }
                    ]}
                    labelId='manage_publishing'
                    id='manage_publishing'
                    value={enteredValues.publishingType}
                    disabled={isPending || isApprovedScheduled || isRejected || isBtnLoading}
                    onChange={(event) => {
                        inputChangeHandler(PUBLISHING_TYPE, event.target.value);
                        // Clear datetime error when switching away from scheduled
                        if (event.target.value !== 'schedule') {
                            setDatetimeError(false);
                        }
                    }}
                />
                {
                    enteredValues.publishingType === 'schedule' &&
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
                                disabled={isPending || isApprovedScheduled || isRejected || isBtnLoading}
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
                        disabled={isPending || isApprovedScheduled || isRejected || isBtnLoading}
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
                        disabled={isPending || isApprovedScheduled || isRejected || isBtnLoading}
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
                        disabled={isPending || isApprovedScheduled || isRejected || isBtnLoading}
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
                        disabled={isPending || isApprovedScheduled || isRejected || isBtnLoading}
                        onChange={(event) => { inputChangeHandler(PHONE_NUMBER, event.target.value) }}
                />
            </ContentCard>
            </>
            )}

            {isApprovedScheduled ? (
                <DialogPopup
                    title="Cancel Release"
                    isOpen={showCancelDialog && isApprovedScheduled}
                    setIsOpen={(open) => {
                        if (open === false) {
                            setCancelConfirmText('');
                            setShowCancelDialog(false);
                        }
                    }}
                    onClose={() => !isCanceling}
                    actionTitle={isCanceling ? 'Canceling...' : 'Cancel Release'}
                    actionDisabled={isCanceling || cancelConfirmText.trim().toLowerCase() !== 'confirm'}
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCancelConfirm();
                    }}
                    PaperProps={{
                        sx: {
                            maxWidth: '480px',
                            width: '80%',
                        },
                    }}
                >
                    <div className={styles.cancelReleaseContent}>
                        <p style={{ marginBottom: '16px' }}>
                            Are you sure you want to cancel the release?
                        </p>
                        <p style={{ marginBottom: '16px' }}>
                            Canceling will delay your release and you will need to resubmit for review again.
                        </p>
                        <p style={{ marginBottom: '8px' }}>
                            Type <strong>confirm</strong> to cancel the scheduled release.
                        </p>
                        <div style={{ marginBottom: '16px' }}>
                            <FormTextField
                                placeholder="confirm"
                                id="cancel_confirm"
                                name="cancel_confirm"
                                value={cancelConfirmText}
                                onChange={(e) => setCancelConfirmText(e.target.value)}
                            />
                        </div>
                        <p style={{ marginBottom: 0, fontWeight: 'bold' }}>
                            This action cannot be undone.
                        </p>
                    </div>
                </DialogPopup>
            ) : (
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
            )}

            <AlertModal
                open={showCancelSuccessPopup}
                onClose={() => {
                    setShowCancelSuccessPopup(false);
                    refetchReleaseData();
                }}
                title="Cancelled"
                description="The release has been cancelled."
                onAction={() => {
                    setShowCancelSuccessPopup(false);
                    refetchReleaseData();
                }}
                actionButtonText="OK"
                showActionButton={true}
                type="success"
                sx={{
                    '& .MuiDialog-paper': {
                        maxWidth: '480px',
                        width: '80%',
                    },
                }}
            />
        </form>
    )
};

export default SubmissionView;
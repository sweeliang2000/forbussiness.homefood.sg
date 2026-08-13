'use client';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import styles from './page.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { Button, TextField } from '@mui/material';
import { FaCheck } from 'react-icons/fa';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import apiClient from '@/utility/api';
import {
  OFFICIAL_BUSINESS_INFORMATION,
  RELEASE_STATUS,
  PUBLISH_BUSINESS_DETAILS_UPDATE,
} from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';

const BUSINESS_NAME = 'businessName';
const UEN = 'uen';
const UNIT_NUMBER = 'unitNumber';
const BUILDING_NAME = 'buildingName';
const STREET_ADDRESS = 'streetAddress';
const POSTAL_CODE = 'postalCode';

export default function StampSetup() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);
  const [isLoadingErrorStatus, setIsLoadingErrorStatus] = useState(null);

  const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  const [isBtnDisabled, setIsBtnDisabled] = useState(true);
  const [isUpdate, setIsUpdate] = useState(false);
  const [isEdit, setIsEdit] = useState(true);
  const [releaseStatus, setReleaseStatus] = useState(null);

  // Saved-but-unpublished changes, mirroring the other publish-enabled pages.
  // Unlike them, publishing here opens an admin review instead of writing to
  // the live shop — a shop's legal identity needs a human to sign it off.
  const [hasPublishableChanges, setHasPublishableChanges] = useState(false);
  const [isPublishLoading, setIsPublishLoading] = useState(false);
  const [isPublishSuccess, setIsPublishSuccess] = useState(false);

  const [enteredValues, setEnteredValues] = useState({
    [BUSINESS_NAME]: '',
    [UEN]: '',
    [UNIT_NUMBER]: '',
    [BUILDING_NAME]: '',
    [STREET_ADDRESS]: '',
    [POSTAL_CODE]: '',
  });

  // Store initial values to compare for unsaved changes
  const initialValuesRef = useRef({
    [BUSINESS_NAME]: '',
    [UEN]: '',
    [UNIT_NUMBER]: '',
    [BUILDING_NAME]: '',
    [STREET_ADDRESS]: '',
    [POSTAL_CODE]: '',
  });

  // Track if we've pushed a history state for back button handling
  const historyStatePushedRef = useRef(false);

  const [textfieldError, setTextfieldError] = useState({
    [BUSINESS_NAME]: false,
    [UEN]: false,
    [UNIT_NUMBER]: false,
    [BUILDING_NAME]: false,
    [STREET_ADDRESS]: false,
    [POSTAL_CODE]: false,
  });

  const [helperText, setHelperText] = useState({
    [BUSINESS_NAME]: '',
    [UEN]: '',
    [UNIT_NUMBER]: '',
    [BUILDING_NAME]: '',
    [STREET_ADDRESS]: '',
    [POSTAL_CODE]: '',
  });

  const inputChangeHandler = (key, value) => {
    setIsSubmissionSuccess(false);
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

  const showError = (message) => {
    setIsError(true);
    setErrorMessage(message)
  };

  const clearError = () => {
    setIsError(false);
    setErrorMessage('')
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!isEdit) return false; // No unsaved changes if not in edit mode
    
    const current = enteredValues;
    const initial = initialValuesRef.current;
    
    return (
      current[BUSINESS_NAME] !== initial[BUSINESS_NAME] ||
      current[UEN] !== initial[UEN] ||
      current[UNIT_NUMBER] !== initial[UNIT_NUMBER] ||
      current[BUILDING_NAME] !== initial[BUILDING_NAME] ||
      current[STREET_ADDRESS] !== initial[STREET_ADDRESS] ||
      current[POSTAL_CODE] !== initial[POSTAL_CODE]
    );
  };

  const formSubmissionHandler = async (event) => {
    event.preventDefault();
    setIsBtnLoading(true);
    clearError();

    // isBusinessDetailApproved is server-owned now — the admin's approval sets
    // it, and publishBusinessDetailsUpdate clears it. Sending "False" from here
    // would mark an unchanged shop as unapproved on every save.
    const payload = {
      [BUSINESS_NAME]: enteredValues[BUSINESS_NAME],
      [UEN]: enteredValues[UEN],
      "address": {
        [UNIT_NUMBER]: enteredValues[UNIT_NUMBER],
        [BUILDING_NAME]: enteredValues[BUILDING_NAME],
        [STREET_ADDRESS]: enteredValues[STREET_ADDRESS],
        [POSTAL_CODE]: enteredValues[POSTAL_CODE]
      }
    };

    try {
      if (isUpdate) {
        console.log('Updating existing business information');
        await apiClient.put(`${OFFICIAL_BUSINESS_INFORMATION}`, payload);
      } else {
        console.log('Creating new business information');
        await apiClient.post(`${OFFICIAL_BUSINESS_INFORMATION}`, payload);
      }
      // TODO: - Create UI to show successfully saved
      setIsSubmissionSuccess(true);
      setIsBtnLoading(false);
      clearError();

      // Saving is what arms the Publish button — the server has just set
      // isChanges on the row.
      setHasPublishableChanges(true);
      setIsPublishSuccess(false);

      // Update initial values after successful save
      initialValuesRef.current = { ...enteredValues };
    } catch (error) {
      // TODO: - Create UI to show error if happened.
      const errorData = error?.response?.data;
      const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
      showError(`An error had occurred. ${message} (Error code: ${code}). Please try to save it again.`);
      setIsBtnLoading(false);
    }
  };

  /**
   * Submits the saved business details for admin review.
   *
   * The server answers 200 with "No changes to review" when the values match
   * what is already approved — a merchant who edited a field and put it back.
   * That is a success, not an error: the button just retires.
   */
  const publishBusinessDetails = async () => {
    setIsPublishLoading(true);
    clearError();

    try {
      const response = await apiClient.post(PUBLISH_BUSINESS_DETAILS_UPDATE);
      const submitted = response.data?.data?.status === 'pending';

      if (submitted) {
        // The shop is in the review queue now, which locks editing everywhere.
        // Reload so every page picks up the new release status at once.
        window.location.reload();
        return;
      }

      // Nothing to review — the values already match the approved ones.
      setHasPublishableChanges(false);
      setIsPublishSuccess(true);
    } catch (error) {
      const errorData = error?.response?.data;
      const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      showError(`Could not submit your business details for review. ${message}`);
    } finally {
      setIsPublishLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);

    const retrieveInformation = async (event) => {
      try {
        const response = await apiClient.get(`${OFFICIAL_BUSINESS_INFORMATION}`)
        const data = response.data;

        if (data && data.data) {
          const addressBuildingName = data.data.addressBuildingName;
          const addressPostalCode = data.data.addressPostalCode;
          const addressStreetAddress = data.data.addressStreetAddress;
          const addressUnitNumber = data.data.addressUnitNumber;
          const businessName = data.data.businessName;
          const isBusinessDetailApproved = data.data.isBusinessDetailApproved;
          const uen = data.data.uen;
          const isEditValue = data.data.isEdit;

          // Set isEdit state
          setIsEdit(isEditValue !== undefined ? isEditValue : true);

          // Saved but not yet sent for review.
          setHasPublishableChanges(!!data.data.isChanges);

          // Check if any of the required fields have values to determine if this is an update
          const hasData = businessName || uen || addressUnitNumber || addressBuildingName || addressStreetAddress || addressPostalCode;
          
          if (hasData) {
            setIsUpdate(true);
            const loadedValues = {
              [BUSINESS_NAME]: businessName || '',
              [UEN]: uen || '',
              [UNIT_NUMBER]: addressUnitNumber || '',
              [BUILDING_NAME]: addressBuildingName || '',
              [STREET_ADDRESS]: addressStreetAddress || '',
              [POSTAL_CODE]: addressPostalCode || '',
            };
            setEnteredValues(loadedValues);
            // Store initial values for comparison
            initialValuesRef.current = { ...loadedValues };
          } else {
            // Initialize with empty values
            initialValuesRef.current = {
              [BUSINESS_NAME]: '',
              [UEN]: '',
              [UNIT_NUMBER]: '',
              [BUILDING_NAME]: '',
              [STREET_ADDRESS]: '',
              [POSTAL_CODE]: '',
            };
          }
        } else {
          // No data returned, initialize with empty values
          initialValuesRef.current = {
            [BUSINESS_NAME]: '',
            [UEN]: '',
            [UNIT_NUMBER]: '',
            [BUILDING_NAME]: '',
            [STREET_ADDRESS]: '',
            [POSTAL_CODE]: '',
          };
        }

        setIsLoading(false);
        setIsBtnLoading(false);
      } catch (error) {
        const message = error?.response?.data?.message || error.message;
        const code = error?.response?.data?.code || error.code;
        const statusCode = error?.response?.status;
        setIsLoading(false);
        setIsBtnLoading(false);
        setErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
        setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
        setIsLoadingErrorStatus(statusCode ?? null);
      }
    };

    retrieveInformation();
  
  }, []);

  // Fetch release status to determine messaging when not editable
  useEffect(() => {
    const fetchReleaseStatus = async () => {
      try {
        const response = await apiClient.get(RELEASE_STATUS);
        const data = response.data;
        if (data && data.data && data.data.status) {
          setReleaseStatus(data.data.status);
        }
      } catch {
        // Silently ignore errors for release status; it is not critical for this page
      }
    };

    fetchReleaseStatus();
  }, []);


  // Update button disabled state based on unsaved changes
  useEffect(() => {
    if (!isEdit) {
      setIsBtnDisabled(true);
      return;
    }
    
    const hasChanges = hasUnsavedChanges();
    setIsBtnDisabled(!hasChanges);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- hasUnsavedChanges derived from enteredValues/isEdit; omit to avoid re-running every keystroke
  }, [enteredValues, isEdit]);

  // Handle browser refresh/close/back button warning
  useEffect(() => {
    const checkUnsavedChanges = () => {
      if (!isEdit) return false;
      
      const current = enteredValues;
      const initial = initialValuesRef.current;
      
      return (
        current[BUSINESS_NAME] !== initial[BUSINESS_NAME] ||
        current[UEN] !== initial[UEN] ||
        current[UNIT_NUMBER] !== initial[UNIT_NUMBER] ||
        current[BUILDING_NAME] !== initial[BUILDING_NAME] ||
        current[STREET_ADDRESS] !== initial[STREET_ADDRESS] ||
        current[POSTAL_CODE] !== initial[POSTAL_CODE]
      );
    };

    // Handle browser refresh, close, and back button
    const handleBeforeUnload = (e) => {
      if (checkUnsavedChanges()) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we can still show a generic warning
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Handle browser back/forward button using history manipulation
    const handlePopState = (e) => {
      if (checkUnsavedChanges()) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.');
        if (!confirmed) {
          // Push state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
          historyStatePushedRef.current = true;
        } else {
          // User confirmed, allow navigation
          historyStatePushedRef.current = false;
        }
      }
    };

    // Push a state to history when there are unsaved changes to intercept back button
    const updateHistoryState = () => {
      if (checkUnsavedChanges() && !historyStatePushedRef.current) {
        window.history.pushState({ unsavedChanges: true }, '', window.location.href);
        historyStatePushedRef.current = true;
      } else if (!checkUnsavedChanges() && historyStatePushedRef.current) {
        // If changes are saved, reset the flag
        historyStatePushedRef.current = false;
      }
    };

    // Intercept clicks on links to show confirmation
    const handleLinkClick = (e) => {
      if (checkUnsavedChanges()) {
        // Check if it's a link that navigates away
        const link = e.target.closest('a');
        if (link && link.href) {
          // Check if it's an internal link (same origin) or external
          const isInternalLink = link.href.startsWith(window.location.origin) || link.href.startsWith('/');
          const isAnchorLink = link.href.includes('#') && link.href.split('#')[0] === window.location.href.split('#')[0];
          
          // Only intercept if it's navigating away (not anchor links)
          if (isInternalLink && !isAnchorLink) {
            const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.');
            if (!confirmed) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
          }
        }
      }
    };

    // Add beforeunload event listener for browser refresh/close/back button
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Add popstate listener for back/forward button
    window.addEventListener('popstate', handlePopState);

    // Add click listener to intercept link clicks
    document.addEventListener('click', handleLinkClick, true);

    // Update history state when values change
    updateHistoryState();

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [enteredValues, isEdit]);

  // Publishing enqueues the shop into the normal review queue, so "with the
  // admin team" is simply the pending release status — there is no separate
  // business-details review to ask about.
  const isUnderReview = releaseStatus === 'pending';

  // Saved, not yet sent for review, and nothing half-typed on screen.
  const hasUnpublishedBusinessDetails =
    releaseStatus === 'Released' && hasPublishableChanges && !hasUnsavedChanges();

  return (
    <form
      className={styles.form}
      onSubmit={formSubmissionHandler}
    >
      <HeaderSection
        className={styles.header}
        title='Your Business'
        description={
          <p>
            This information is used to verify your business.
            The details will not be visible to your customers. <Link href='/'>Find out more.</Link>
          </p>
        }
        loading={isBtnLoading}
        isSuccess={isSubmissionSuccess}
        setShowError={setIsError}
        isError={isError}
        isDisabled={isBtnDisabled || !isEdit}
        errorMessage={errorMessage}
        infoMessage={
          !isEdit
            ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.'
            : null
        }
        warningMessage={
          isUnderReview
            ? 'Your changes are with our team for review. Your shop stays live on the details we approved previously until then.'
            : hasUnpublishedBusinessDetails
              ? 'You have saved changes that are not published yet. Publish them to send them to our team for review.'
              : null
        }
        rightActions={
          // Only a released shop can have a re-review: before that, business
          // details go through the first-release review with everything else.
          releaseStatus === 'Released' ? (
            <Button
              // Explicit: this button sits inside the Save form, and a default
              // of "submit" would save instead of publish.
              type="button"
              size="small"
              variant="outlined"
              color="primary"
              loading={isPublishLoading}
              loadingPosition="start"
              startIcon={isPublishSuccess ? <FaCheck /> : undefined}
              // Disabled over unsaved edits: publishing would submit the values
              // on the server, not the ones on screen.
              disabled={
                isUnderReview || isPublishSuccess || !hasPublishableChanges || hasUnsavedChanges()
              }
              onClick={publishBusinessDetails}
              sx={{ textTransform: 'none' }}
            >
              {isUnderReview
                ? 'Under review'
                : isPublishSuccess
                  ? 'Sent for review'
                  : 'Send for review'}
            </Button>
          ) : null
        }
      />

      {
        isLoading ? 
        <LoadingPage/> :
        isLoadingErrorMessage !== null ? 
        <ErrorPage message={isLoadingErrorMessage} statusCode={isLoadingErrorStatus} /> :
        <>
          <ContentCard className={styles.content}>
            <div>
              <FieldHeader
                title='Official information'
              />

              <FormTextField
                title='Business Name*'
                subtitle='This is the name customers will see in the app. For home-based or unregistered businesses, you can use your personal name or brand name.'
                placeholder='Sunrise Bakery'
                id={BUSINESS_NAME}
                name={BUSINESS_NAME}
                helperText={helperText.businessName}
                error={textfieldError.businessName}
                value={enteredValues.businessName}
                disabled={isBtnLoading || !isEdit}
                onChange={(event) => { inputChangeHandler(BUSINESS_NAME, event.target.value) }}
              />
            </div>

            <div>
              <FormTextField
                title='Unique Entity Number (UEN)'
                subtitle="Required for registered businesses in Singapore. If you are operating a home-based or unregistered business, you may leave this blank or enter 'N/A'."
                placeholder='e.g. 202512345A or N/A'
                id={UEN}
                name={UEN}
                helperText={helperText.uen}
                value={enteredValues.uen}
                error={textfieldError.uen}
                disabled={isBtnLoading || !isEdit}
                onChange={(event) => { inputChangeHandler(UEN, event.target.value) }}
              />
            </div>

            <div>
              <FieldHeader
                title='Business Address'
                description='For registered businesses, enter your official registered address. Home-based businesses can use their residential address or leave this blank if not required.'
                type='h3'
              />

              <div className={styles.addressFields}>
                <TextField
                  label='Unit Number*'
                  variant='outlined'
                  placeholder='#05-23'
                  fullWidth
                  id={UNIT_NUMBER}
                  name={UNIT_NUMBER}
                  helperText={helperText.unitNumber}
                  value={enteredValues.unitNumber}
                  error={textfieldError.unitNumber}
                  disabled={isBtnLoading || !isEdit}
                  onChange={(event) => { inputChangeHandler(UNIT_NUMBER, event.target.value) }}
                />

                <TextField
                  label='Building Name (Optional)'
                  variant='outlined'
                  placeholder='International Plaza'
                  fullWidth
                  id={BUILDING_NAME}
                  name={BUILDING_NAME}
                  helperText={helperText.buildingName}
                  error={textfieldError.buildingName}
                  value={enteredValues.buildingName}
                  disabled={isBtnLoading || !isEdit}
                  onChange={(event) => { inputChangeHandler(BUILDING_NAME, event.target.value) }}
                />

                <TextField
                  label='Street Address*'
                  variant='outlined'
                  placeholder='10 Anson Road'
                  fullWidth
                  id={STREET_ADDRESS}
                  name={STREET_ADDRESS}
                  helperText={helperText.streetAddress}
                  error={textfieldError.streetAddress}
                  value={enteredValues.streetAddress}
                  disabled={isBtnLoading || !isEdit}
                  onChange={(event) => { inputChangeHandler(STREET_ADDRESS, event.target.value) }}
                />

                <TextField
                  label='Postal Code*'
                  variant='outlined'
                  placeholder='079903'
                  fullWidth
                  type='number'
                  slotProps={{
                    input: {
                      maxLength: 6,
                    },
                  }}
                  id={POSTAL_CODE}
                  name={POSTAL_CODE}
                  helperText={helperText.postalCode}
                  error={textfieldError.postalCode}
                  value={enteredValues.postalCode}
                  disabled={isBtnLoading || !isEdit}
                  onChange={(event) => { inputChangeHandler(POSTAL_CODE, event.target.value) }}
                />
              </div>
            </div>
          </ContentCard>
        </>
      }
    </form>
  );
}

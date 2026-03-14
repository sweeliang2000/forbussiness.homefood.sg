'use client';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import styles from './page.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { TextField } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import apiClient from '@/utility/api';
import { OFFICIAL_BUSINESS_INFORMATION, RELEASE_STATUS } from '@/utility/apiPaths';
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

    const payload = {
      [BUSINESS_NAME]: enteredValues[BUSINESS_NAME],
      [UEN]: enteredValues[UEN],
      "address": {
        [UNIT_NUMBER]: enteredValues[UNIT_NUMBER],
        [BUILDING_NAME]: enteredValues[BUILDING_NAME],
        [STREET_ADDRESS]: enteredValues[STREET_ADDRESS],
        [POSTAL_CODE]: enteredValues[POSTAL_CODE]
      },
      "isBusinessDetailsApproved": "False"
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
        isSuccess={isSubmissionSuccess || releaseStatus === 'approved_scheduled'}
        setShowError={setIsError}
        isError={isError}
        isDisabled={isBtnDisabled || !isEdit}
        errorMessage={errorMessage}
        successMessage={
          !isEdit && releaseStatus === 'approved_scheduled'
            ? (
              <>
                Your release has been approved. It will be released on the date you stated on{' '}
                <Link href="/app/release/submission">Release Submission Page</Link>.
                {' '}If you wish to change the date, cancel and re-send for approval. For any enquiry or urgent release, please email support@collbine.com.
              </>
            )
            : null
        }
        infoMessage={
          !isEdit && releaseStatus !== 'approved_scheduled'
            ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.'
            : null
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
                title='Business name*'
                subtitle='The official business name registered with ACRA. For example, McDonald&apos;s Corporation.'
                placeholder='McDonald&apos;s Corporation.'
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
                title='Unique Entity Number (UEN)*'
                subtitle='The Unique Entity Number (UEN) is a 9- or 10-digit number issued by the Accounting and Corporate Regulatory Authority (ACRA) for registered businesses in Singapore.'
                placeholder='McDonalds'
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
                title='Registered Business Address'
                description='This is the name that customers will see in the app for example, McDonalds.'
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
                  label='Building Name'
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

'use client';
import styles from './CustomerFacingBusinessPage.module.css';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { TextField } from '@mui/material';
import LocationSection from './LocationSecion';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import apiClient from '@/utility/api';
import { CUSTOMER_FACING_INFORMATION, RELEASE_STATUS } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';

const DISPLAY_NAME = 'displayName';
const SHOP_DESCRIPTION = 'description';
const WEBSITE = 'website';
const CATEGORY = 'category';
const HALAL_CERTIFIED = 'halalCertified';
const KEYWORDS = 'keywords';

const LOCATION_TEMPLATE = {
    id: 1,
    locationName: 'Ang Mo Kio Hub Ang Mo Kio Hub Ang Mo Kio Hub Ang Mo Kio Hub',
    address: '53 Ang Mo Kio Ave 3',
    postalCode: '569933',
    operatingHours: {
        Monday: { start: '10:00 AM', end: '10:00 PM' },
        Tuesday: { start: '10:00 AM', end: '10:00 PM' },
        Wednesday: { start: '10:00 AM', end: '10:00 PM' },
        Thursday: { start: '10:00 AM', end: '10:00 PM' },
        Friday: { start: '10:00 AM', end: '10:00 PM' },
        Saturday: { start: '10:00 AM', end: '10:00 PM' },
        Sunday: { start: '10:00 AM', end: '10:00 PM' },
    }
};


const CustomerFacingBusinessPage = () => {
    // For initial Loading Status
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);
    const [isLoadingErrorStatus, setIsLoadingErrorStatus] = useState(null);

    // For Header Status
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isBtnLoading, setIsBtnLoading] = useState(false);
    const [isBtnDisabled, setIsBtnDisabled] = useState(true);
    const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
    const [hasExistingData, setHasExistingData] = useState(false);
    const [isEdit, setIsEdit] = useState(true);
    const [releaseStatus, setReleaseStatus] = useState(null);

    const [thumbnailImages, setThumbnailImages] = useState([]);
    const [bannerImages, setBannerImages] = useState([]);
    const [locations, setLocations] = useState([]);
    const [isThumbnailDeleted, setIsThumbnailDeleted] = useState(false);
    const [isBannerDeleted, setIsBannerDeleted] = useState(false);

    const [enteredValues, setEnteredValues] = useState({
        [DISPLAY_NAME]: '',
        [SHOP_DESCRIPTION]: '',
        [WEBSITE]: '',
        [CATEGORY]: '',
        [HALAL_CERTIFIED]: '',
        [KEYWORDS]: '',
    });

    // Store initial values to compare for unsaved changes
    const initialValuesRef = useRef({
        [DISPLAY_NAME]: '',
        [SHOP_DESCRIPTION]: '',
        [WEBSITE]: '',
        [CATEGORY]: '',
        [HALAL_CERTIFIED]: '',
        [KEYWORDS]: '',
    });
    const initialThumbnailImagesRef = useRef([]);
    const initialBannerImagesRef = useRef([]);
    const initialLocationsRef = useRef([]);
    
    // Track if we've pushed a history state for back button handling
    const historyStatePushedRef = useRef(false);

    const [textfieldError, setTextfieldError] = useState({
        [DISPLAY_NAME]: false,
        [SHOP_DESCRIPTION]: false,
        [WEBSITE]: false,
        [CATEGORY]: false,
        [HALAL_CERTIFIED]: false,
        [KEYWORDS]: false
    });

    const [helperText, setHelperText] = useState({
        [DISPLAY_NAME]: '',
        [SHOP_DESCRIPTION]: '',
        [WEBSITE]: '',
        [CATEGORY]: '',
        [HALAL_CERTIFIED]: '',
        [KEYWORDS]: ''
    });

    const resetSaving= () => {
        setIsSubmissionSuccess(false);
        console.log('resetSaving');
    };

    const handleThumbnailImagesChange = (newImages) => {
        setThumbnailImages(newImages);
        resetSaving();
    };

    const inputChangeHandler = (key, value) => {
        resetSaving();
        setEnteredValues((prevValues) => ({
            ...prevValues,
            [key]: value
        }))
    };

    const showError = (message) => {
        setIsError(true);
        setErrorMessage(message)
    };

    const formSubmissionHandler = async (event) => {
        event.preventDefault();
        setIsBtnLoading(true);

        try {
            const formData = new FormData();
            console.log(locations)

            formData.append('displayName', enteredValues[DISPLAY_NAME]);
            formData.append('description', enteredValues[SHOP_DESCRIPTION]);
            formData.append('website', enteredValues[WEBSITE]);
            formData.append('category', enteredValues[CATEGORY]);
            formData.append('halalcertified', enteredValues[HALAL_CERTIFIED]);

            if (thumbnailImages.length > 0 && thumbnailImages[0] !== null) {
                formData.append('thumbnail', thumbnailImages[0].file);
            }

            if (bannerImages.length > 0 && bannerImages[0] !== null) {
                formData.append('banner', bannerImages[0].file);
            }
            formData.append('keywords', enteredValues[KEYWORDS]);
            formData.append('locations', JSON.stringify(locations));
            
            // Add isThumbnailDeleted flag for PUT requests
            console.log('isThumbnailDeleted', isThumbnailDeleted)
            if (isThumbnailDeleted) {
                formData.append('isThumbnailDeleted', 'true');
            }
            
            // Add isBannerDeleted flag for PUT requests
            console.log('isBannerDeleted', isBannerDeleted)
            if (isBannerDeleted) {
                formData.append('isBannerDeleted', 'true');
            }

            // Debugging: log each form data entry
            // Uncomment this to look at the form data
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }

            // Use POST for new data, PUT for updating existing data
            const httpMethod = hasExistingData ? 'put' : 'post';
            await apiClient[httpMethod](CUSTOMER_FACING_INFORMATION, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Form submitted successfully');
            setIsSubmissionSuccess(true);
            setIsBtnLoading(false);
            
            // Update initial values after successful save
            initialValuesRef.current = { ...enteredValues };
            initialThumbnailImagesRef.current = JSON.parse(JSON.stringify(thumbnailImages));
            initialBannerImagesRef.current = JSON.parse(JSON.stringify(bannerImages));
            initialLocationsRef.current = JSON.parse(JSON.stringify(locations));
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            const displayMessage = `An error had occurred. ${message} (Error code: ${code}). Please try to save again.`;
            console.error(`Form submission error: ${message} (Error code: ${code})`);
            setIsSubmissionSuccess(false);
            showError(displayMessage);
        } finally {
            setIsBtnLoading(false);
        }
    };

    // Track thumbnail deletion
    useEffect(() => {
        if (hasExistingData) {
            console.log('Thumbnail images changed:', {
                hasExistingData,
                thumbnailImagesLength: thumbnailImages.length,
                thumbnailImages: thumbnailImages
            });
            
            // If we had an existing thumbnail loaded from server and now it's deleted
            if (thumbnailImages.length === 0) {
                setIsThumbnailDeleted(true);
            } else if (thumbnailImages.length > 0) {
                setIsThumbnailDeleted(false);
            }
            
            // Call resetSaving when thumbnail changes
            resetSaving();
        }
    }, [thumbnailImages, hasExistingData]);

    // Track banner deletion
    useEffect(() => {
        if (hasExistingData) {
            console.log('Banner images changed:', {
                hasExistingData,
                bannerImagesLength: bannerImages.length,
                bannerImages: bannerImages
            });
            
            // If we had an existing banner loaded from server and now it's deleted
            if (bannerImages.length === 0) {
                console.log('DELETED - banner was deleted');
                setIsBannerDeleted(true);
            } else if (bannerImages.length > 0) {
                console.log('NOT DELETED - banner exists or was added');
                setIsBannerDeleted(false);
            }
            
            // Call resetSaving when banner changes
            resetSaving();
        }
    }, [bannerImages, hasExistingData]);

    useEffect(() => {
        const getFormData = async () => {
            setIsBtnLoading(true);
    
            try {
                const response = await apiClient.get(`${CUSTOMER_FACING_INFORMATION}`);
                const data = response.data.data;

                if (data) {
                    setHasExistingData(true);
                    const isEditValue = data.isEdit;
                    setIsEdit(isEditValue !== undefined ? isEditValue : true);
                    
                    const loadedValues = {
                        [DISPLAY_NAME]: data.displayName,
                        [SHOP_DESCRIPTION]: data.description,
                        [WEBSITE]: data.website,
                        [CATEGORY]: data.category,
                        [HALAL_CERTIFIED]: data.halalcertified,
                        [KEYWORDS]: data.keywords
                    };
                    setEnteredValues(loadedValues);
                    
                    // Store initial values for comparison
                    initialValuesRef.current = { ...loadedValues };
                    
                    const loadedThumbnails = data.thumbnail_signedUrl !== "" 
                        ? [{ name: data.thumbnail_signedUrl, file: null, url: data.thumbnail_signedUrl }]
                        : [];
                    setThumbnailImages(loadedThumbnails);
                    initialThumbnailImagesRef.current = JSON.parse(JSON.stringify(loadedThumbnails));
                    
                    const loadedBanners = data.banner_signedUrl !== "" 
                        ? [{ name: data.banner_signedUrl, file: null, url: data.banner_signedUrl }]
                        : [];
                    setBannerImages(loadedBanners);
                    initialBannerImagesRef.current = JSON.parse(JSON.stringify(loadedBanners));
                    
                    setLocations(data.locations);
                    initialLocationsRef.current = JSON.parse(JSON.stringify(data.locations));
                } else {
                    setHasExistingData(false);
                    // Initialize with empty values
                    initialValuesRef.current = {
                        [DISPLAY_NAME]: '',
                        [SHOP_DESCRIPTION]: '',
                        [WEBSITE]: '',
                        [CATEGORY]: '',
                        [HALAL_CERTIFIED]: '',
                        [KEYWORDS]: '',
                    };
                    initialThumbnailImagesRef.current = [];
                    initialBannerImagesRef.current = [];
                    initialLocationsRef.current = [];
                }
    
                setIsLoading(false);
                setIsBtnLoading(false);
            } catch (error) {
                const errorData = error?.response?.data;
                const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
                const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
                const statusCode = error?.response?.status;
                setIsLoading(false);
                setIsBtnLoading(false);
                setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
                setIsLoadingErrorStatus(statusCode ?? null);
            }
        };

        getFormData();
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

    // Check if there are unsaved changes
    const checkUnsavedChanges = () => {
        if (!isEdit) return false; // No unsaved changes if not in edit mode
        
        const current = enteredValues;
        const initial = initialValuesRef.current;
        
        // Check form fields
        const formFieldsChanged = (
            current[DISPLAY_NAME] !== initial[DISPLAY_NAME] ||
            current[SHOP_DESCRIPTION] !== initial[SHOP_DESCRIPTION] ||
            current[WEBSITE] !== initial[WEBSITE] ||
            current[CATEGORY] !== initial[CATEGORY] ||
            current[HALAL_CERTIFIED] !== initial[HALAL_CERTIFIED] ||
            current[KEYWORDS] !== initial[KEYWORDS]
        );
        
        // Check thumbnail images (compare by URL, name, or file presence)
        const normalizeImage = (img) => ({
            url: img?.url || '',
            name: img?.name || '',
            hasFile: !!img?.file
        });
        const thumbnailChanged = JSON.stringify(thumbnailImages.map(normalizeImage)) !== 
            JSON.stringify(initialThumbnailImagesRef.current.map(normalizeImage)) ||
            thumbnailImages.length !== initialThumbnailImagesRef.current.length;
        
        // Check banner images
        const bannerChanged = JSON.stringify(bannerImages.map(normalizeImage)) !== 
            JSON.stringify(initialBannerImagesRef.current.map(normalizeImage)) ||
            bannerImages.length !== initialBannerImagesRef.current.length;
        
        // Check locations
        const locationsChanged = JSON.stringify(locations) !== JSON.stringify(initialLocationsRef.current);
        
        return formFieldsChanged || thumbnailChanged || bannerChanged || locationsChanged;
    };

    // Update button disabled state based on unsaved changes
    useEffect(() => {
        if (!isEdit) {
            setIsBtnDisabled(true);
            return;
        }
        
        const hasChanges = checkUnsavedChanges();
        setIsBtnDisabled(!hasChanges);
    }, [enteredValues, thumbnailImages, bannerImages, locations, isEdit]);

    // Handle browser refresh/close/back button warning
    useEffect(() => {
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
    }, [enteredValues, thumbnailImages, bannerImages, locations, isEdit]);

    return (
        <>
            <form
                className={styles.form}
                onSubmit={formSubmissionHandler}
            >
                <HeaderSection
                    className={styles.header}
                    title='Your Business'
                    description={
                        <p>
                            The details will be visible to your customers and used for searches. <Link href='/'>Find out more.</Link>
                        </p>

                    }
                    loading={isBtnLoading}
                    isSuccess={isSubmissionSuccess || releaseStatus === 'approved_scheduled'}
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
                        <LoadingPage /> :
                        isLoadingErrorMessage !== null ?
                            <ErrorPage message={isLoadingErrorMessage} statusCode={isLoadingErrorStatus} /> :
                            <ContentCard className={styles.content}>
                                <FormTextField
                                    title='Display name*'
                                    subtitle='Display name will be shown on the home screen when user discover your shop. It is better to be something that user used to identify you.'
                                    placeholder="Keen's Bagelry"
                                    id={DISPLAY_NAME}
                                    name={DISPLAY_NAME}
                                    helperText={helperText.displayName}
                                    error={textfieldError.displayName}
                                    value={enteredValues.displayName}
                                    disabled={isBtnLoading || !isEdit}
                                    onChange={(event) => { inputChangeHandler(DISPLAY_NAME, event.target.value) }}
                                />

                                <FormTextField
                                    title="Shop's Description*"
                                    subtitle='Information about your shop.'
                                    placeholder="Keen's Bagelry"
                                    id={SHOP_DESCRIPTION}
                                    name={SHOP_DESCRIPTION}
                                    helperText={helperText.description}
                                    error={textfieldError.description}
                                    value={enteredValues.description}
                                    disabled={isBtnLoading || !isEdit}
                                    onChange={(event) => { inputChangeHandler(SHOP_DESCRIPTION, event.target.value) }}
                                    multiline
                                    slotProps={{
                                        input: {
                                            min: 0,
                                            maxLength: 10,
                                        },
                                    }}
                                />

                                <FormTextField
                                    title="Website"
                                    id={WEBSITE}
                                    name={WEBSITE}
                                    helperText={helperText.website}
                                    error={textfieldError.website}
                                    value={enteredValues.website}
                                    disabled={isBtnLoading || !isEdit}
                                    onChange={(event) => { inputChangeHandler(WEBSITE, event.target.value) }}
                                />

                                <div className={styles.fieldContainer}>
                                    <FieldHeader
                                        title='Category'
                                        type='h3'
                                    />

                                    <FullWidthDropdown
                                        value={enteredValues.category}
                                        onChange={(event) => { inputChangeHandler(CATEGORY, event.target.value) }}
                                        options={[
                                            { value: 'food_and_beverage', title: 'Food and Beverage' },
                                            { value: 'retailers', title: 'Retailers' },
                                            { value: 'service', title: 'Service' }
                                        ]}
                                        disabled={!isEdit}
                                    />
                                </div>
                                {
                                    enteredValues.category === 'food_and_beverage' &&
                                    <div className={styles.fieldContainer}>
                                        <FieldHeader
                                            title='Halal Certified'
                                            type='h3'
                                        />

                                        <FullWidthDropdown
                                            value={enteredValues.halalCertified}
                                            onChange={(event) => { inputChangeHandler(HALAL_CERTIFIED, event.target.value) }}
                                            options={[
                                                { value: 'Yes', title: 'Yes' },
                                                { value: 'No', title: 'No' },
                                                { value: 'Not Applicable', title: 'Not Applicable' }
                                            ]}
                                            disabled={!isEdit}
                                        />
                                    </div>
                                }

                                <div className={styles.fieldContainer}>
                                    <FieldHeader
                                        title='Thumbnail / Featured Image'
                                        description='Include one or more keywords that describe your business. Keywords make Collbine App search results more accurate. Separate keywords with an English comma, Chinese comma, or a mix of both.'
                                        type='h3'
                                    />

                                    <DragDropImageUploader
                                        images={thumbnailImages}
                                        setImages={setThumbnailImages}
                                        resetSaving={resetSaving}
                                        noOfImages={1}
                                        width={180}
                                        height={180}
                                        imageClassName={styles.dragdropImage}
                                        disabled={!isEdit}
                                    />
                                </div>

                                <div className={styles.fieldContainer}>
                                    <FieldHeader
                                        title='Banner Image'
                                        description='Include one or more keywords that describe your business. Keywords make Collbine App search results more accurate. Separate keywords with an English comma, Chinese comma, or a mix of both.'
                                        type='h3'
                                    />

                                    <DragDropImageUploader
                                        images={bannerImages}
                                        setImages={setBannerImages}
                                        noOfImages={1}
                                        resetSaving={resetSaving}
                                        width={792}
                                        height={198}
                                        imageClassName={styles.dragdropBannerImage}
                                        disabled={!isEdit}
                                    />
                                </div>

                                <FormTextField
                                    title="Keywords*"
                                    subtitle='Include one or more keywords that describe your business. Keywords make Collbine App search results more accurate. Separate keywords with an English comma, Chinese comma, or a mix of both.'
                                    id={KEYWORDS}
                                    name={KEYWORDS}
                                    helperText={helperText.keywords}
                                    error={textfieldError.keywords}
                                    value={enteredValues.keywords}
                                    disabled={isBtnLoading || !isEdit}
                                    onChange={(event) => { inputChangeHandler(KEYWORDS, event.target.value) }}
                                    slotProps={{
                                        input: {
                                            min: 0,
                                            maxLength: 10,
                                        },
                                    }}
                                />
                            </ContentCard>
                }
            </form>

            {
                (!isLoading && isLoadingErrorMessage === null) &&
                <LocationSection
                    locations={locations}
                    setLocations={setLocations}
                    resetSaving={resetSaving}
                    isEdit={isEdit}
                />
            }
        </>
    )
};

export default CustomerFacingBusinessPage;
'use client';
import styles from './CustomerFacingBusinessPage.module.css';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import LocationSection from './LocationSecion';
import ShopLinkSection from './ShopLinkSection';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import apiClient from '@/utility/api';
import { CUSTOMER_FACING_INFORMATION, RELEASE_STATUS, STRIPE_CONNECT_ACCOUNT_STATUS, PUBLISH_UPDATE } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import { FaCheck } from 'react-icons/fa';

const DISPLAY_NAME = 'displayName';
const SHOP_DESCRIPTION = 'description';
const WEBSITE = 'website';
const INSTAGRAM = 'instagram';
const FACEBOOK = 'facebook';
const WHATSAPP = 'whatsapp';
const TIKTOK = 'tiktok';
const PHONE_NUMBER = 'phoneNumber';
const CATEGORY = 'category';
const HALAL_CERTIFIED = 'halalCertified';
const KEYWORDS = 'keywords';

const sanitize = (value) => (!value || value === 'undefined') ? '' : value;

const formatSgPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
};

const stripSgPrefix = (value) => {
    const v = sanitize(value);
    if (!v) return '';
    return formatSgPhone(v.replace(/^\+65\s?/, ''));
};

const toFullSgPhone = (value) => {
    const v = sanitize(value);
    return v ? `+65 ${v}` : '';
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
    const [isPublishLoading, setIsPublishLoading] = useState(false);
    const [isPublishSuccess, setIsPublishSuccess] = useState(false);
    const [publishError, setPublishError] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);

    const [thumbnailImages, setThumbnailImages] = useState([]);
    const [bannerImages, setBannerImages] = useState([]);
    const [location, setLocation] = useState(null);
    const [isThumbnailDeleted, setIsThumbnailDeleted] = useState(false);
    const [isBannerDeleted, setIsBannerDeleted] = useState(false);

    const [enteredValues, setEnteredValues] = useState({
        [DISPLAY_NAME]: '',
        [SHOP_DESCRIPTION]: '',
        [WEBSITE]: '',
        [INSTAGRAM]: '',
        [FACEBOOK]: '',
        [WHATSAPP]: '',
        [TIKTOK]: '',
        [PHONE_NUMBER]: '',
        [CATEGORY]: '',
        [HALAL_CERTIFIED]: '',
        [KEYWORDS]: '',
    });

    // Store initial values to compare for unsaved changes
    const initialValuesRef = useRef({
        [DISPLAY_NAME]: '',
        [SHOP_DESCRIPTION]: '',
        [WEBSITE]: '',
        [INSTAGRAM]: '',
        [FACEBOOK]: '',
        [WHATSAPP]: '',
        [TIKTOK]: '',
        [PHONE_NUMBER]: '',
        [CATEGORY]: '',
        [HALAL_CERTIFIED]: '',
        [KEYWORDS]: '',
    });
    const initialThumbnailImagesRef = useRef([]);
    const initialBannerImagesRef = useRef([]);
    const initialLocationRef = useRef(null);
    
    // Track if we've pushed a history state for back button handling
    const historyStatePushedRef = useRef(false);

    const [textfieldError, setTextfieldError] = useState({
        [DISPLAY_NAME]: false,
        [SHOP_DESCRIPTION]: false,
        [WEBSITE]: false,
        [INSTAGRAM]: false,
        [FACEBOOK]: false,
        [WHATSAPP]: false,
        [TIKTOK]: false,
        [PHONE_NUMBER]: false,
        [CATEGORY]: false,
        [HALAL_CERTIFIED]: false,
        [KEYWORDS]: false
    });

    const [helperText, setHelperText] = useState({
        [DISPLAY_NAME]: '',
        [SHOP_DESCRIPTION]: '',
        [WEBSITE]: '',
        [INSTAGRAM]: '',
        [FACEBOOK]: '',
        [WHATSAPP]: '',
        [TIKTOK]: '',
        [PHONE_NUMBER]: '',
        [CATEGORY]: '',
        [HALAL_CERTIFIED]: '',
        [KEYWORDS]: ''
    });

    const resetSaving= () => {
        setIsSubmissionSuccess(false);
        setHasUnsavedEdits(true);
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

    const phoneChangeHandler = (key, value) => {
        resetSaving();
        setEnteredValues((prevValues) => ({
            ...prevValues,
            [key]: formatSgPhone(value)
        }));
    };

    const showError = (message) => {
        setIsError(true);
        setErrorMessage(message)
    };

    const handlePublishUpdate = () => {
        setShowPublishConfirm(true);
    };

    const handleConfirmPublish = async () => {
        setShowPublishConfirm(false);
        setIsPublishLoading(true);
        setIsPublishSuccess(false);
        setPublishError('');
        try {
            await apiClient.post(PUBLISH_UPDATE);
            setIsPublishSuccess(true);
            setHasChanges(false);
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            setPublishError(`Failed to publish update. ${message} (Error code: ${code})`);
        } finally {
            setIsPublishLoading(false);
        }
    };

    const formSubmissionHandler = async (event) => {
        event.preventDefault();
        setIsBtnLoading(true);

        try {
            const formData = new FormData();
            console.log(location)

            formData.append('displayName', sanitize(enteredValues[DISPLAY_NAME]));
            formData.append('description', sanitize(enteredValues[SHOP_DESCRIPTION]));
            formData.append('website', sanitize(enteredValues[WEBSITE]));
            formData.append('instagram', sanitize(enteredValues[INSTAGRAM]));
            formData.append('facebook', sanitize(enteredValues[FACEBOOK]));
            formData.append('whatsapp', toFullSgPhone(enteredValues[WHATSAPP]));
            formData.append('tiktok', sanitize(enteredValues[TIKTOK]));
            formData.append('phoneNumber', toFullSgPhone(enteredValues[PHONE_NUMBER]));
            formData.append('category', sanitize(enteredValues[CATEGORY]));
            formData.append('halalcertified', sanitize(enteredValues[HALAL_CERTIFIED]));

            if (thumbnailImages.length > 0 && thumbnailImages[0] !== null) {
                formData.append('thumbnail', thumbnailImages[0].file);
            }

            if (bannerImages.length > 0 && bannerImages[0] !== null) {
                formData.append('banner', bannerImages[0].file);
            }
            formData.append('keywords', sanitize(enteredValues[KEYWORDS]));
            formData.append('location', JSON.stringify(location ?? {}));
            
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
            setHasChanges(true);
            setHasUnsavedEdits(false);
            setIsPublishSuccess(false);

            // Update initial values after successful save
            initialValuesRef.current = { ...enteredValues };
            initialThumbnailImagesRef.current = JSON.parse(JSON.stringify(thumbnailImages));
            initialBannerImagesRef.current = JSON.parse(JSON.stringify(bannerImages));
            initialLocationRef.current = JSON.parse(JSON.stringify(location));
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
            setIsThumbnailDeleted(thumbnailImages.length === 0);
        }
    }, [thumbnailImages, hasExistingData]);

    // Track banner deletion
    useEffect(() => {
        if (hasExistingData) {
            setIsBannerDeleted(bannerImages.length === 0);
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
                    setHasChanges(data.isChanges ?? false);
                    
                    const loadedValues = {
                        [DISPLAY_NAME]: sanitize(data.displayName),
                        [SHOP_DESCRIPTION]: sanitize(data.description),
                        [WEBSITE]: sanitize(data.website),
                        [INSTAGRAM]: sanitize(data.instagram),
                        [FACEBOOK]: sanitize(data.facebook),
                        [WHATSAPP]: stripSgPrefix(data.whatsapp),
                        [TIKTOK]: sanitize(data.tiktok),
                        [PHONE_NUMBER]: stripSgPrefix(data.phoneNumber || data.phone_number),
                        [CATEGORY]: sanitize(data.category),
                        [HALAL_CERTIFIED]: sanitize(data.halalcertified),
                        [KEYWORDS]: sanitize(data.keywords),
                    };
                    setEnteredValues(loadedValues);
                    console.log('loadedValues', loadedValues);
                    
                    // Store initial values for comparison
                    initialValuesRef.current = { ...loadedValues };
                    
                    const thumbnailUrl = sanitize(data.thumbnail_signedUrl);
                    const loadedThumbnails = thumbnailUrl
                        ? [{ name: 'Shop thumbnail', file: null, url: thumbnailUrl }]
                        : [];
                    setThumbnailImages(loadedThumbnails);
                    initialThumbnailImagesRef.current = JSON.parse(JSON.stringify(loadedThumbnails));
                    
                    const bannerUrl = sanitize(data.banner_signedUrl);
                    const loadedBanners = bannerUrl
                        ? [{ name: 'Shop banner', file: null, url: bannerUrl }]
                        : [];
                    setBannerImages(loadedBanners);
                    initialBannerImagesRef.current = JSON.parse(JSON.stringify(loadedBanners));
                    
                    const loadedLocation = Array.isArray(data.locations)
                        ? (data.locations[0] ?? null)
                        : (data.location ?? data.locations ?? null);
                    setLocation(loadedLocation);
                    initialLocationRef.current = JSON.parse(JSON.stringify(loadedLocation));
                } else {
                    setHasExistingData(false);
                    // Initialize with empty values
                    initialValuesRef.current = {
                        [DISPLAY_NAME]: '',
                        [SHOP_DESCRIPTION]: '',
                        [WEBSITE]: '',
                        [INSTAGRAM]: '',
                        [FACEBOOK]: '',
                        [WHATSAPP]: '',
                        [TIKTOK]: '',
                        [PHONE_NUMBER]: '',
                        [CATEGORY]: '',
                        [HALAL_CERTIFIED]: '',
                        [KEYWORDS]: '',
                    };
                    initialThumbnailImagesRef.current = [];
                    initialBannerImagesRef.current = [];
                    initialLocationRef.current = null;
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

    // Fetch release status and isEdit from account status
    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const [releaseRes, accountRes] = await Promise.all([
                    apiClient.get(RELEASE_STATUS),
                    apiClient.get(STRIPE_CONNECT_ACCOUNT_STATUS),
                ]);

                const releaseData = releaseRes.data;
                if (releaseData && releaseData.data && releaseData.data.status) {
                    setReleaseStatus(releaseData.data.status);
                }

                const accountData = accountRes.data;
                if (accountData && accountData.isEdit !== undefined) {
                    setIsEdit(accountData.isEdit);
                }
            } catch {
                // Silently ignore errors; not critical for this page
            }
        };

        fetchStatuses();
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
            current[INSTAGRAM] !== initial[INSTAGRAM] ||
            current[FACEBOOK] !== initial[FACEBOOK] ||
            current[WHATSAPP] !== initial[WHATSAPP] ||
            current[TIKTOK] !== initial[TIKTOK] ||
            current[PHONE_NUMBER] !== initial[PHONE_NUMBER] ||
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
        const locationChanged = JSON.stringify(location) !== JSON.stringify(initialLocationRef.current);
        
        return formFieldsChanged || thumbnailChanged || bannerChanged || locationChanged;
    };

    // Update button disabled state based on unsaved changes
    useEffect(() => {
        if (!isEdit) {
            setIsBtnDisabled(true);
            return;
        }
        
        const hasChanges = checkUnsavedChanges();
        setIsBtnDisabled(!hasChanges);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkUnsavedChanges derived from deps; omit to avoid re-running every keystroke
    }, [enteredValues, thumbnailImages, bannerImages, location, isEdit]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkUnsavedChanges derived from deps; omit to avoid re-running every keystroke
    }, [enteredValues, thumbnailImages, bannerImages, location, isEdit]);

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
                    isSuccess={isSubmissionSuccess}
                    isError={isError || !!publishError}
                    isDisabled={isBtnDisabled || !isEdit}
                    errorMessage={publishError || errorMessage}
                    infoMessage={
                        !isEdit
                            ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.'
                            : null
                    }
                    rightActions={
                        releaseStatus === 'Released' ? (
                            <Button
                                size='small'
                                variant='outlined'
                                color='primary'
                                loading={isPublishLoading}
                                loadingPosition='start'
                                onClick={handlePublishUpdate}
                                disabled={isPublishSuccess || !hasChanges || hasUnsavedEdits}
                                startIcon={isPublishSuccess ? <FaCheck /> : undefined}
                                style={{ textTransform: 'none' }}
                            >
                                {isPublishSuccess ? 'Update Published' : 'Publish Update'}
                            </Button>
                        ) : null
                    }
                />

                {
                    isLoading ?
                        <LoadingPage /> :
                        isLoadingErrorMessage !== null ?
                            <ErrorPage message={isLoadingErrorMessage} statusCode={isLoadingErrorStatus} /> :
                            <>
                                <ContentCard className={styles.content}>
                                    <FormTextField
                                        title='Display name*'
                                        subtitle='Display name will be shown on the home screen when user discover your shop. It is better to be something that user used to identify you.'
                                        placeholder='Sunrise Bakery'
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
                                        placeholder='Fresh Market Cafe'
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
                                </ContentCard>

                                <ShopLinkSection shopName={enteredValues.displayName} className={styles.content} />

                                <ContentCard className={styles.content}>
                                    <FieldHeader
                                        title='Contact & Social Links'
                                        description='Optional. Add channels customers can use to message or call your business.'
                                        type='h3'
                                    />

                                    <FormTextField
                                        title='Instagram'
                                        placeholder='https://instagram.com/yourshop or @yourshop'
                                        id={INSTAGRAM}
                                        name={INSTAGRAM}
                                        helperText={helperText.instagram}
                                        error={textfieldError.instagram}
                                        value={enteredValues.instagram}
                                        disabled={isBtnLoading || !isEdit}
                                        onChange={(event) => { inputChangeHandler(INSTAGRAM, event.target.value) }}
                                    />

                                    <FormTextField
                                        title='Facebook'
                                        placeholder='https://facebook.com/yourshop'
                                        id={FACEBOOK}
                                        name={FACEBOOK}
                                        helperText={helperText.facebook}
                                        error={textfieldError.facebook}
                                        value={enteredValues.facebook}
                                        disabled={isBtnLoading || !isEdit}
                                        onChange={(event) => { inputChangeHandler(FACEBOOK, event.target.value) }}
                                    />

                                    <FormTextField
                                        title='TikTok'
                                        placeholder='https://tiktok.com/@yourshop or @yourshop'
                                        id={TIKTOK}
                                        name={TIKTOK}
                                        helperText={helperText.tiktok}
                                        error={textfieldError.tiktok}
                                        value={enteredValues.tiktok}
                                        disabled={isBtnLoading || !isEdit}
                                        onChange={(event) => { inputChangeHandler(TIKTOK, event.target.value) }}
                                    />

                                    <FormTextField
                                        title='WhatsApp'
                                        placeholder='9123 4567'
                                        id={WHATSAPP}
                                        name={WHATSAPP}
                                        helperText={helperText.whatsapp}
                                        error={textfieldError.whatsapp}
                                        value={enteredValues.whatsapp}
                                        disabled={isBtnLoading || !isEdit}
                                        onChange={(event) => { phoneChangeHandler(WHATSAPP, event.target.value) }}
                                        slotProps={{
                                            input: {
                                                startAdornment: <InputAdornment position="start">+65</InputAdornment>,
                                            }
                                        }}
                                    />

                                    <FormTextField
                                        title='Phone Number'
                                        placeholder='6123 4567'
                                        id={PHONE_NUMBER}
                                        name={PHONE_NUMBER}
                                        helperText={helperText.phoneNumber}
                                        error={textfieldError.phoneNumber}
                                        value={enteredValues.phoneNumber}
                                        disabled={isBtnLoading || !isEdit}
                                        onChange={(event) => { phoneChangeHandler(PHONE_NUMBER, event.target.value) }}
                                        slotProps={{
                                            input: {
                                                startAdornment: <InputAdornment position="start">+65</InputAdornment>,
                                            }
                                        }}
                                    />
                                </ContentCard>

                                <ContentCard className={styles.content}>
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
                                            description='Aspect ratio: 1:1. Include one or more keywords that describe your business. Keywords make HomeFood App search results more accurate. Separate keywords with an English comma, Chinese comma, or a mix of both.'
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
                                            description='Aspect ratio: 4:1. Include one or more keywords that describe your business. Keywords make HomeFood App search results more accurate. Separate keywords with an English comma, Chinese comma, or a mix of both.'
                                            type='h3'
                                        />

                                        <DragDropImageUploader
                                            images={bannerImages}
                                            setImages={setBannerImages}
                                            noOfImages={1}
                                            resetSaving={resetSaving}
                                            width={480}
                                            height={120}
                                            imageClassName={styles.dragdropBannerImage}
                                            disabled={!isEdit}
                                        />
                                    </div>

                                    <FormTextField
                                        title="Keywords*"
                                        subtitle='Include one or more keywords that describe your business. Keywords make HomeFood App search results more accurate. Separate keywords with an English comma, Chinese comma, or a mix of both.'
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

                                <LocationSection
                                    location={location}
                                    setLocation={setLocation}
                                    resetSaving={resetSaving}
                                    isEdit={isEdit}
                                />
                            </>
                }
            </form>

            <Dialog open={showPublishConfirm} onClose={() => setShowPublishConfirm(false)}>
                <DialogTitle>Publish Update for Customer Facing Details</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to publish your updates? This will make your latest changes visible to customers immediately.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowPublishConfirm(false)} style={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmPublish} variant='contained' style={{ textTransform: 'none' }}>
                        Publish
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
};

export default CustomerFacingBusinessPage;

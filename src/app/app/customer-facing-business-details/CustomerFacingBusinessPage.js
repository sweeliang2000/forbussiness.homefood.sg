'use client';
import styles from './CustomerFacingBusinessPage.module.css';
import { useEffect, useState } from 'react';
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
import { CUSTOMER_FACING_INFORMATION } from '@/utility/apiPaths';
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

    // For Header Status
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isBtnLoading, setIsBtnLoading] = useState(false);
    const [isBtnDisabled, setIsBtnDisabled] = useState(true);
    const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
    const [hasExistingData, setHasExistingData] = useState(false);
    const [isEdit, setIsEdit] = useState(true);

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
        setIsBtnDisabled(false);
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
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            console.error(`Form submission error: ${message} (Error code: ${code})`);
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
                    
                    setEnteredValues({
                        [DISPLAY_NAME]: data.displayName,
                        [SHOP_DESCRIPTION]: data.description,
                        [WEBSITE]: data.website,
                        [CATEGORY]: data.category,
                        [HALAL_CERTIFIED]: data.halalcertified,
                        [KEYWORDS]: data.keywords
                    })
                    if (data.thumbnail_signedUrl !== "") {
                        setThumbnailImages([{ name: data.thumbnail_signedUrl, file: null, url: data.thumbnail_signedUrl }])
                    }
                    if (data.banner_signedUrl !== "") {
                        setBannerImages([{ name: data.banner_signedUrl, file: null, url: data.banner_signedUrl }])
                    }
                    setLocations(data.locations);
                } else {
                    setHasExistingData(false);
                }
    
                setIsLoading(false);
                setIsBtnLoading(false);
            } catch (error) {
                const errorData = error?.response?.data;
                const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
                const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
                setIsLoading(false);
                setIsBtnLoading(false);
                setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
            }
        };

        getFormData();
    }, [])

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
                    isError={isError}
                    isDisabled={isBtnDisabled || !isEdit}
                    errorMessage={errorMessage}
                    infoMessage={!isEdit ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.' : null}
                />

                {
                    isLoading ?
                        <LoadingPage /> :
                        isLoadingErrorMessage !== null ?
                            <ErrorPage /> :
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
                                    title="Website*"
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
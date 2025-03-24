'use client';
import styles from './CustomerFacingBusinessPage.module.css';
import { useState } from 'react';
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
    const [thumbnailImages, setThumbnailImages] = useState([]);
    const [bannerImages, setBannerImages] = useState([]);

    const [isBtnLoading, setIsBtnLoading] = useState(false);
    const [locations, setLocations] = useState([])

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

    const inputChangeHandler = (key, value) => {
        // setIsSubmissionSuccess(false);
        // setIsBtnDisabled(false);
        setEnteredValues((prevValues) => ({
            ...prevValues,
            [key]: value
        }))
    };

    const formSubmissionHandler = async (event) => {
        event.preventDefault();
        setIsBtnLoading(true);
    
        try {
            const formData = new FormData();

            formData.append('displayName', enteredValues[DISPLAY_NAME]);
            formData.append('description', enteredValues[SHOP_DESCRIPTION]);
            formData.append('website', enteredValues[WEBSITE]);
            formData.append('category', enteredValues[CATEGORY]);
            formData.append('halalcertified', enteredValues[HALAL_CERTIFIED]);

            if (thumbnailImages.length > 0) {
                formData.append('thumbnail', thumbnailImages[0].file);
            }
    
            if (bannerImages.length > 0) {
                formData.append('banner', bannerImages[0].file);
            }

            formData.append('keywords', enteredValues[KEYWORDS]);
            formData.append('locations', JSON.stringify(locations));
    
            // Debugging: log each form data entry
            // Uncomment this to look at the form data
            // for (let [key, value] of formData.entries()) {
            //     console.log(`${key}:`, value);
            //     console.log('');
            // }
    
            await apiClient.post(CUSTOMER_FACING_INFORMATION, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Form submitted successfully');
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setIsBtnLoading(false);
        }
    };
    

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
                />

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
                        disabled={isBtnLoading}
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
                        disabled={isBtnLoading}
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
                        disabled={isBtnLoading}
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
                                options={[
                                    { value: 'Yes', title: 'Yes' },
                                    { value: 'No', title: 'No' },
                                    { value: 'Not Applicable', title: 'Not Applicable' }
                                ]}
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
                            noOfImages={1}
                            width={180}
                            height={180}
                            imageClassName={styles.dragdropImage}
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
                            width={792}
                            height={198}
                            imageClassName={styles.dragdropBannerImage}
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
                        disabled={isBtnLoading}
                        onChange={(event) => { inputChangeHandler(KEYWORDS, event.target.value) }}
                        slotProps={{
                            input: {
                                min: 0,
                                maxLength: 10,
                            },
                        }}
                    />
                </ContentCard>
            </form>

            <LocationSection 
                locations={locations}
                setLocations={setLocations}
            />
        </>
    )
};

export default CustomerFacingBusinessPage;
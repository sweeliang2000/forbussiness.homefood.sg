'use client';
import styles from './CardDesign.module.css';
import { ContentCard } from "@/components/ContentCard/ContentCard";
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { HeaderSection } from "@/components/HeaderSection/HeaderSection";
import Link from "next/link";
import { MuiColorInput } from 'mui-color-input'
import { useEffect, useState, useRef, useCallback } from 'react';
import StampCard from '@/components/StampCard/StampCard';
import { Button, Slider } from '@mui/material';
import { CARD_DESIGN_SETTING, STAMP_MANAGEMENT, RELEASE_STATUS } from '@/utility/apiPaths';
import apiClient from '@/utility/api';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import DigitalStampRewardSystemOnboarding from '@/components/DigitalStampRewardSystemOnboarding/DigitalStampRewardSystemOnboarding';

const CardDesign = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);
    const [isLoadingErrorStatus, setIsLoadingErrorStatus] = useState(null);
    const [stampIsEnabled, setStampIsEnabled] = useState(false);


    const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isBtnLoading, setIsBtnLoading] = useState(false);
    const [isBtnDisabled, setIsBtnDisabled] = useState(true);
    const [isEdit, setIsEdit] = useState(true);
    const [releaseStatus, setReleaseStatus] = useState(null);

    const [cardBackground, setCardBackgroundColor] = useState('#ffffff')
    const [cardTitleColor, setCardTitleColor] = useState('#000000')
    const [cardFooterColor, setCardFooterColor] = useState('#797979')
    const [cardNoStampBorderColor, setCardNoStampBorderColor] = useState('#dddddd')
    const [cardStampBackground, setCardStampBackground] = useState('#e8f9ff')
    const [cardNoStampBackgroundColor, setCardNoStampBackgroundColor] = useState('#ffffff')
    const [cardStampCollectedBorderColor, setCardStampCollectedBorderColor] = useState('#e8f9ff')
    const [checkmarkColor, setCheckmarkColor] = useState('#6698aa')
    const [numberOfStamp, setNumberOfStamp] = useState(18);
    const [collectedStamps, setCollectedStamps] = useState(10);
    const [spendAmount, setSpendAmount] = useState(10);
    const [expiryDate, setExpiryDate] = useState('31 Dec 2023');
    const [prizeSteps, setPrizeSteps] = useState([6]);

    // Stamp management data
    const [cardTitle, setCardTitle] = useState('');
    const [cardDescription, setCardDescription] = useState('');
    const [numberOfStamps, setNumberOfStamps] = useState(6);
    const [expirationType, setExpirationType] = useState('validForDays');
    const [numberOfDaysToExpire, setNumberOfDaysToExpire] = useState(30);
    const [stamped_url, setStamped_url] = useState('');
    const [unstamped_url, setUnstamped_url] = useState('');

    // Store initial values to compare for unsaved changes
    const initialCardBackgroundRef = useRef('#ffffff');
    const initialCardTitleColorRef = useRef('#000000');
    const initialCardFooterColorRef = useRef('#797979');
    const initialCardNoStampBorderColorRef = useRef('#dddddd');
    const initialCardStampBackgroundRef = useRef('#e8f9ff');
    const initialCardNoStampBackgroundColorRef = useRef('#ffffff');
    const initialCardStampCollectedBorderColorRef = useRef('#e8f9ff');
    const initialCheckmarkColorRef = useRef('#6698aa');
    
    // Track if we've pushed a history state for back button handling
    const historyStatePushedRef = useRef(false);

    const resetToDefaultColor = () => {
        if (!isEdit) return;
        setCardBackgroundColor('#ffffff');
        setCardTitleColor('#000000');
        setCardFooterColor('#797979');
        setCardNoStampBorderColor('#dddddd');
        setCardNoStampBackgroundColor('#ffffff');
        setCardStampCollectedBorderColor('#e8f9ff');
        setCardStampBackground('#e8f9ff');
        setCheckmarkColor('#6698aa');
        enableSaveBtn();
    };

    const handleCollectedStampsChange = (event, newValue) => {
        setCollectedStamps(newValue);
    };

    const enableSaveBtn = () => {
        setIsSubmissionSuccess(false);
    };

    const showError = (message) => {
        setIsError(true);
        setErrorMessage(message)
    };

    const formSubmissionHandler = async (event) => {
        event.preventDefault();
        setIsBtnLoading(true);

        const payload = {
            "backgroundColor": cardBackground,
            "titleColor": cardTitleColor,
            "footerTextColor": cardFooterColor,
            "noStampBorderColor": cardNoStampBorderColor,
            "noStampBackgroundColor": cardNoStampBackgroundColor,
            "stampBorderColor": cardStampCollectedBorderColor,
            "stampBackgroundColor": cardStampBackground,
            "checkmarkColor": checkmarkColor,
        }

        try {
            await apiClient.post(`${CARD_DESIGN_SETTING}`, payload);
            setIsSubmissionSuccess(true);
            setIsBtnLoading(false);
            
            // Update initial values after successful save
            initialCardBackgroundRef.current = cardBackground;
            initialCardTitleColorRef.current = cardTitleColor;
            initialCardFooterColorRef.current = cardFooterColor;
            initialCardNoStampBorderColorRef.current = cardNoStampBorderColor;
            initialCardStampBackgroundRef.current = cardStampBackground;
            initialCardNoStampBackgroundColorRef.current = cardNoStampBackgroundColor;
            initialCardStampCollectedBorderColorRef.current = cardStampCollectedBorderColor;
            initialCheckmarkColorRef.current = checkmarkColor;
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            showError(`An error had occurred. ${message} (Error code: ${code}). Please try to save it again.`);
            setIsBtnLoading(false);
        }
    };

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cardDesignResponse, stampManagementResponse] = await Promise.allSettled([
                apiClient.get(CARD_DESIGN_SETTING),
                apiClient.get(STAMP_MANAGEMENT)
            ]);

            // Handle card design data
            if (cardDesignResponse.status === 'fulfilled') {
                const cardDesignData = cardDesignResponse.value.data;
                console.log(cardDesignData);

                if (cardDesignData && cardDesignData.data) {
                        const isEditValue = cardDesignData.data.isEdit;
                        setIsEdit(isEditValue !== undefined ? isEditValue : true);
                        
                        const loadedBackground = cardDesignData.data.backgroundColor || '#ffffff';
                        const loadedTitleColor = cardDesignData.data.titleColor || '#000000';
                        const loadedFooterColor = cardDesignData.data.footerTextColor || '#797979';
                        const loadedNoStampBorderColor = cardDesignData.data.noStampBorderColor || '#dddddd';
                        const loadedNoStampBackgroundColor = cardDesignData.data.noStampBackgroundColor || '#ffffff';
                        const loadedStampCollectedBorderColor = cardDesignData.data.stampBorderColor || '#e8f9ff';
                        const loadedStampBackground = cardDesignData.data.stampBackgroundColor || '#e8f9ff';
                        const loadedCheckmarkColor = cardDesignData.data.checkmarkColor || '#6698aa';
                        
                        setCardBackgroundColor(loadedBackground);
                        setCardTitleColor(loadedTitleColor);
                        setCardFooterColor(loadedFooterColor);
                        setCardNoStampBorderColor(loadedNoStampBorderColor);
                        setCardNoStampBackgroundColor(loadedNoStampBackgroundColor);
                        setCardStampCollectedBorderColor(loadedStampCollectedBorderColor);
                        setCardStampBackground(loadedStampBackground);
                        setCheckmarkColor(loadedCheckmarkColor);
                        
                        // Store initial values for comparison
                        initialCardBackgroundRef.current = loadedBackground;
                        initialCardTitleColorRef.current = loadedTitleColor;
                        initialCardFooterColorRef.current = loadedFooterColor;
                        initialCardNoStampBorderColorRef.current = loadedNoStampBorderColor;
                        initialCardNoStampBackgroundColorRef.current = loadedNoStampBackgroundColor;
                        initialCardStampCollectedBorderColorRef.current = loadedStampCollectedBorderColor;
                        initialCardStampBackgroundRef.current = loadedStampBackground;
                        initialCheckmarkColorRef.current = loadedCheckmarkColor;
                    } else {
                        // Initialize with default values
                        initialCardBackgroundRef.current = '#ffffff';
                        initialCardTitleColorRef.current = '#000000';
                        initialCardFooterColorRef.current = '#797979';
                        initialCardNoStampBorderColorRef.current = '#dddddd';
                        initialCardStampBackgroundRef.current = '#e8f9ff';
                        initialCardNoStampBackgroundColorRef.current = '#ffffff';
                        initialCardStampCollectedBorderColorRef.current = '#e8f9ff';
                        initialCheckmarkColorRef.current = '#6698aa';
                    }
                } else {
                    console.warn('Failed to fetch card design data:', cardDesignResponse.reason);
                }

            // Handle stamp management data
            if (stampManagementResponse.status === 'fulfilled') {
                const stampData = stampManagementResponse.value.data?.data;
                const enabled = stampData?.isEnabled === 'true' || stampData?.isEnabled === true;
                setStampIsEnabled(!!enabled);
                console.log(stampData);
                if (stampData) {
                        setCardTitle(stampData.cardTitle || '');
                        setCardDescription(stampData.cardDescription || '');
                        setNumberOfStamps(stampData.numberOfStamps || 6);
                        const expType = stampData.expirationType || 'validForDays';
                        const daysToExpire = parseInt(stampData.numberOfDaysToExpire, 10) || 30;
                        setExpirationType(expType);
                        setNumberOfDaysToExpire(stampData.numberOfDaysToExpire || 30);
                        setStamped_url(stampData.defaultStampedUrl_Presign || '');
                        setUnstamped_url(stampData.defaultUnStampedUrl_Presign || '');

                        // Expiry display: from today + N days as "DD MMM YYYY", or "This card has no expiration."
                        if (expType === 'noExpiration') {
                            setExpiryDate('This card has no expiration.');
                        } else if (expType === 'validForDays' && !Number.isNaN(daysToExpire)) {
                            const expiry = new Date();
                            expiry.setDate(expiry.getDate() + daysToExpire);
                            const day = expiry.getDate();
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            setExpiryDate(`${day} ${months[expiry.getMonth()]} ${expiry.getFullYear()}`);
                        } else {
                            setExpiryDate('31 Dec 2023');
                        }

                        // Parse cardStepDetails and extract prize steps
                        if (stampData.cardStepDetails) {
                            try {
                                const parsedCardSteps = typeof stampData.cardStepDetails === 'string'
                                    ? JSON.parse(stampData.cardStepDetails)
                                    : stampData.cardStepDetails;
                                
                                // Extract prize steps from card steps that have rewards
                                const prizeStepsFromData = parsedCardSteps
                                    .filter(step => step.reward && step.reward !== null)
                                    .map(step => step.id);
                                
                                if (prizeStepsFromData.length > 0) {
                                    setPrizeSteps(prizeStepsFromData);
                                } else {
                                    setPrizeSteps([]);
                                }
                            } catch (parseError) {
                                console.error('Error parsing cardStepDetails:', parseError);
                            }
                        }
                        
                        // Update the preview values
                        setNumberOfStamp(stampData.numberOfStamps || 6);
                        setSpendAmount(10); // Default spend amount
                    }
            } else {
                console.warn('Failed to fetch stamp management data:', stampManagementResponse.reason);
                setStampIsEnabled(false);
            }

            // Only show error if both requests failed
            if (cardDesignResponse.status === 'rejected' && stampManagementResponse.status === 'rejected') {
                const error = cardDesignResponse.reason || stampManagementResponse.reason;
                const errorData = error?.response?.data;
                const message = errorData?.error?.message || errorData?.message || error?.message || 'Failed to load data';
                const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
                const statusCode = error?.response?.status;
                showError(`An error had occurred. ${message} (Error code: ${code})`);
                setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
                setIsLoadingErrorStatus(statusCode ?? null);
            }

            setIsLoading(false);
        } catch (error) {
            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error?.code;
            const statusCode = error?.response?.status;
            setIsLoading(false);
            setIsBtnLoading(false);
            showError(`An error had occurred. ${message} (Error code: ${code})`);
            setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
            setIsLoadingErrorStatus(statusCode ?? null);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

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
        
        return (
            cardBackground !== initialCardBackgroundRef.current ||
            cardTitleColor !== initialCardTitleColorRef.current ||
            cardFooterColor !== initialCardFooterColorRef.current ||
            cardNoStampBorderColor !== initialCardNoStampBorderColorRef.current ||
            cardStampBackground !== initialCardStampBackgroundRef.current ||
            cardNoStampBackgroundColor !== initialCardNoStampBackgroundColorRef.current ||
            cardStampCollectedBorderColor !== initialCardStampCollectedBorderColorRef.current ||
            checkmarkColor !== initialCheckmarkColorRef.current
        );
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
    }, [cardBackground, cardTitleColor, cardFooterColor, cardNoStampBorderColor, cardStampBackground, cardNoStampBackgroundColor, cardStampCollectedBorderColor, checkmarkColor, isEdit]);

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
    }, [cardBackground, cardTitleColor, cardFooterColor, cardNoStampBorderColor, cardStampBackground, cardNoStampBackgroundColor, cardStampCollectedBorderColor, checkmarkColor, isEdit]);

    const showOnboarding = !isLoading && isLoadingErrorMessage === null && !stampIsEnabled;

    return (
        <form
            className={styles.form}
            onSubmit={formSubmissionHandler}
        >
            {!showOnboarding && (
                <HeaderSection
                    className={styles.header}
                    title='Card Preview'
                    description={
                        <p>
                            Create and design your stamp card and the rewards to be given when
                            customers hit a certain goal. <Link href='/'>Find out more.</Link>
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
            )}

            {
                isLoading ?
                    <LoadingPage /> :
                    isLoadingErrorMessage !== null ?
                        <ErrorPage message={isLoadingErrorMessage} statusCode={isLoadingErrorStatus} /> :
                        showOnboarding ? (
                            <DigitalStampRewardSystemOnboarding
                                onSuccess={() => setStampIsEnabled(true)}
                            />
                        ) : (
                        <div className={styles.contentContainer}>
                            <ContentCard className={styles.cardContainer}>
                                <div className={styles.cardPreviewWrapper}>
                                <StampCard
                                    title={cardTitle || ""}
                                    description={cardDescription || ""}
                                    totalStamps={numberOfStamp}
                                    collectedStamps={collectedStamps}
                                    expiryDate={expiryDate}
                                    spendAmount={spendAmount}
                                    cardBackground={cardBackground}
                                    cardTitleColor={cardTitleColor}
                                    cardFooterColor={cardFooterColor}
                                    cardNoStampBorderColor={cardNoStampBorderColor}
                                    cardStampBackground={cardStampBackground}
                                    cardNoStampBackgroundColor={cardNoStampBackgroundColor}
                                    cardStampCollectedBorderColor={cardStampCollectedBorderColor}
                                    checkmarkColor={checkmarkColor}
                                    prizeSteps={prizeSteps}
                                    stamped_url={stamped_url}
                                    unstamped_url={unstamped_url}
                                />
                                </div>

                                <p className={styles.cardDescription}><Link href='/app/stamp-management'>Modify</Link> number of stamp and stamp icon is at <Link href='/app/stamp-management'>Stamp Management</Link>.</p>
                            </ContentCard>

                            <ContentCard>
                                <div>
                                    <FieldHeader
                                        title='Preview Configuration'
                                        type='h2'
                                    />

                                    <div className={styles.cardConfigContainer}>
                                        <div className={`${styles.field} ${styles.prizeField}`}>
                                            <FieldHeader
                                                title='Collected Stamps'
                                                type='h3'
                                            />
                                            <div className={styles.sliderContainer}>
                                                <Slider
                                                    value={collectedStamps}
                                                    onChange={handleCollectedStampsChange}
                                                    aria-labelledby="collected-stamps-slider"
                                                    valueLabelDisplay="auto"
                                                    step={1}
                                                    marks
                                                    min={0}
                                                    max={numberOfStamp}
                                                    className={styles.slider}
                                                    disabled={!isEdit}
                                                />
                                                <div className={styles.sliderValue}>
                                                    {collectedStamps} / {numberOfStamp}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ContentCard>

                            <ContentCard>
                                <div>
                                    <FieldHeader
                                        title='Stamp Configuration'
                                        type='h2'
                                    />

                                    <div className={styles.cardConfigContainer}>
                                        <div className={styles.field}>
                                            <FieldHeader
                                                title='No Stamp Border Color'
                                                type='h3'
                                            />
                                            <MuiColorInput
                                                className={styles.colorInput}
                                                format="hex" value={cardNoStampBorderColor}
                                                disabled={!isEdit}
                                                onChange={(color) => {
                                                    setCardNoStampBorderColor(color);
                                                    enableSaveBtn();
                                                }} />
                                        </div>

                                        <div className={styles.field}>
                                            <FieldHeader
                                                title='No Stamp Background Color'
                                                type='h3'
                                            />
                                            <MuiColorInput
                                                className={styles.colorInput}
                                                format="hex"
                                                value={cardNoStampBackgroundColor}
                                                disabled={!isEdit}
                                                onChange={(color) => {
                                                    setCardNoStampBackgroundColor(color);
                                                    enableSaveBtn();
                                                }} />
                                        </div>

                                        <div className={styles.field}>
                                            <FieldHeader
                                                title='Stamp Border Color'
                                                type='h3'
                                            />
                                            <MuiColorInput
                                                className={styles.colorInput}
                                                format="hex"
                                                value={cardStampCollectedBorderColor}
                                                disabled={!isEdit}
                                                onChange={(color) => {
                                                    setCardStampCollectedBorderColor(color);
                                                    enableSaveBtn();
                                                }} />
                                        </div>

                                        <div className={styles.field}>
                                            <FieldHeader
                                                title='Stamp Background Color'
                                                type='h3'
                                            />
                                            <MuiColorInput
                                                className={styles.colorInput}
                                                format="hex"
                                                value={cardStampBackground}
                                                disabled={!isEdit}
                                                onChange={(color) => {
                                                    setCardStampBackground(color);
                                                    enableSaveBtn();
                                                }} />
                                        </div>

                                        <div className={styles.field}>
                                            <FieldHeader
                                                title='Checkmark Color'
                                                type='h3'
                                            />
                                            <MuiColorInput
                                                className={styles.colorInput}
                                                format="hex"
                                                value={checkmarkColor}
                                                disabled={!isEdit}
                                                onChange={(color) => {
                                                    setCheckmarkColor(color);
                                                    enableSaveBtn();
                                                }} />
                                        </div>
                                    </div>
                                </div>
                            </ContentCard>

                            <ContentCard>
                                <div>
                                    <FieldHeader
                                        title='Card Configuration'
                                        type='h2'
                                    />

                                    <div className={styles.cardConfigContainer}>
                                        <div className={styles.field}>
                                            <FieldHeader
                                                title='Background Color'
                                                type='h3'
                                            />
                                            <MuiColorInput
                                                className={styles.colorInput}
                                                format="hex"
                                                value={cardBackground}
                                                isAlphaHidden
                                                disabled={!isEdit}
                                                onChange={(color) => {
                                                    setCardBackgroundColor(color);
                                                    enableSaveBtn();
                                                }} />
                                        </div>

                                        <div className={styles.field}>
                                            <FieldHeader
                                                title='Title Color'
                                                type='h3'
                                            />
                                            <MuiColorInput
                                                className={styles.colorInput}
                                                format="hex"
                                                value={cardTitleColor}
                                                isAlphaHidden
                                                disabled={!isEdit}
                                                onChange={(color) => {
                                                    setCardTitleColor(color);
                                                    enableSaveBtn();
                                                }} />
                                        </div>

                                        <div className={styles.field}>
                                            <FieldHeader
                                                title='Footer text Color'
                                                type='h3'
                                            />
                                            <MuiColorInput
                                                className={styles.colorInput}
                                                format="hex"
                                                value={cardFooterColor}
                                                isAlphaHidden
                                                disabled={!isEdit}
                                                onChange={(color) => {
                                                    setCardFooterColor(color);
                                                    enableSaveBtn();
                                                }} />
                                        </div>
                                    </div>
                                </div>
                            </ContentCard>

                            <ContentCard className={styles.footerContainer}>
                                <Button
                                    variant="text"
                                    color="error"
                                    className={styles.resetButton}
                                    onClick={resetToDefaultColor}
                                    disabled={!isEdit}
                                >
                                    Reset to Default
                                </Button>
                            </ContentCard>
                        </div>
                        )
            }
        </form>
    )
};

export default CardDesign;
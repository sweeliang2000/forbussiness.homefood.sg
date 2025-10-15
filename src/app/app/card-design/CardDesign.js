'use client';
import styles from './CardDesign.module.css';
import { ContentCard } from "@/components/ContentCard/ContentCard";
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { HeaderSection } from "@/components/HeaderSection/HeaderSection";
import Link from "next/link";
import { MuiColorInput } from 'mui-color-input'
import { useEffect, useState } from 'react';
import StampCard from '@/components/StampCard/StampCard';
import { Button, Slider } from '@mui/material';
import { CARD_DESIGN_SETTING, STAMP_MANAGEMENT } from '@/utility/apiPaths';
import apiClient from '@/utility/api';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';

const CardDesign = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);


    const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isBtnLoading, setIsBtnLoading] = useState(false);
    const [isBtnDisabled, setIsBtnDisabled] = useState(true);

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

    const resetToDefaultColor = () => {
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
        setIsBtnDisabled(false);
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
        } catch (error) {
            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error.code;
            showError(`An error had occurred. ${message} (Error code: ${code}). Please try to save it again.`);
            setIsBtnLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);

        const fetchAllData = async () => {
            try {
                // Fetch both card design and stamp management data in parallel
                const [cardDesignResponse, stampManagementResponse] = await Promise.allSettled([
                    apiClient.get(CARD_DESIGN_SETTING),
                    apiClient.get(STAMP_MANAGEMENT)
                ]);

                // Handle card design data
                if (cardDesignResponse.status === 'fulfilled') {
                    const cardDesignData = cardDesignResponse.value.data.data;

                    if (cardDesignData) {
                        setCardBackgroundColor(cardDesignData.data.backgroundColor);
                        setCardTitleColor(cardDesignData.data.titleColor);
                        setCardFooterColor(cardDesignData.data.footerTextColor);
                        setCardNoStampBorderColor(cardDesignData.data.noStampBorderColor);
                        setCardNoStampBackgroundColor(cardDesignData.data.noStampBackgroundColor);
                        setCardStampCollectedBorderColor(cardDesignData.data.stampBorderColor);
                        setCardStampBackground(cardDesignData.data.stampBackgroundColor);
                        setCheckmarkColor(cardDesignData.data.checkmarkColor);
                    }
                } else {
                    console.warn('Failed to fetch card design data:', cardDesignResponse.reason);
                }

                // Handle stamp management data
                if (stampManagementResponse.status === 'fulfilled') {
                    const stampData = stampManagementResponse.value.data.data;
                    if (stampData) {
                        setCardTitle(stampData.cardTitle || '');
                        setCardDescription(stampData.cardDescription || '');
                        setNumberOfStamps(stampData.numberOfStamps || 6);
                        setExpirationType(stampData.expirationType || 'validForDays');
                        setNumberOfDaysToExpire(stampData.numberOfDaysToExpire || 30);

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
                                
                                console.log('Parsed cardStepDetails:', parsedCardSteps);
                                console.log('Extracted prize steps:', prizeStepsFromData);
                            } catch (parseError) {
                                console.error('Error parsing cardStepDetails:', parseError);
                            }
                        }
                        
                        // Update the preview values
                        setNumberOfStamp(stampData.numberOfStamps || 6);
                        setSpendAmount(10); // Default spend amount
                        setExpiryDate('31 Dec 2023'); // Default expiry date
                    }
                } else {
                    console.warn('Failed to fetch stamp management data:', stampManagementResponse.reason);
                }

                // Only show error if both requests failed
                if (cardDesignResponse.status === 'rejected' && stampManagementResponse.status === 'rejected') {
                    const error = cardDesignResponse.reason || stampManagementResponse.reason;
                    const message = error?.response?.data?.message || error?.message || 'Failed to load data';
                    const code = error?.response?.data?.code || error?.code || 'UNKNOWN';
                    showError(`An error had occurred. ${message} (Error code: ${code})`);
                    setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
                }

                setIsLoading(false);
            } catch (error) {
                const message = error?.response?.data?.message || error.message;
                const code = error?.response?.data?.code || error.code;
                setIsLoading(false);
                setIsBtnLoading(false);
                showError(`An error had occurred. ${message} (Error code: ${code})`);
                setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
            }
        };

        fetchAllData();
    }, []);

    return (
        <form
            className={styles.form}
            onSubmit={formSubmissionHandler}
        >
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
                isSuccess={isSubmissionSuccess}
                setShowError={setIsError}
                isError={isError}
                isDisabled={isBtnDisabled}
                errorMessage={errorMessage}
            />

            {
                isLoading ?
                    <LoadingPage /> :
                    isLoadingErrorMessage !== null ?
                        <ErrorPage /> :
                        <div className={styles.contentContainer}>
                            <ContentCard className={styles.cardContainer}>
                                <StampCard
                                    title={cardTitle || "Get Free Spiacy Black Whole Leg"}
                                    description={cardDescription || `Earn a stamp when you spend SGD $10.00`}
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
                                />

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
                                >
                                    Reset to Default
                                </Button>
                            </ContentCard>
                        </div>
            }
        </form>
    )
};

export default CardDesign;
'use client';
import styles from './CardDesign.module.css';
import { ContentCard } from "@/components/ContentCard/ContentCard";
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { HeaderSection } from "@/components/HeaderSection/HeaderSection";
import Link from "next/link";
import { MuiColorInput } from 'mui-color-input'
import { useState } from 'react';
import StampCard from '@/components/StampCard/StampCard';
import { Slider } from '@mui/material';

const CardDesign = () => {
    const [cardBackground, setCardBackgroundColor] = useState('#ffffff')
    const [cardTitleColor, setCardTitleColor] = useState('#000000')
    const [cardFooterColor, setCardFooterColor] = useState('#797979')
    const [cardNoStampBorderColor, setCardNoStampBorderColor] = useState('#ddd')
    const [cardStampBackground, setCardStampBackground] = useState('#E8F9FF')
    const [cardNoStampBackgroundColor, setCardNoStampBackgroundColor] = useState('#ffffff')
    const [cardStampCollectedBorderColor, setCardStampCollectedBorderColor] = useState('#E8F9FF')
    const [checkmarkColor, setCheckmarkColor] = useState('#6698aa')
    const [numberOfStamp, setNumberOfStamp] = useState(18);
    const [collectedStamps, setCollectedStamps] = useState(10);
    const [spendAmount, setSpendAmount] = useState(10);
    const [expiryDate, setExpiryDate] = useState('31 Dec 2023');
    const [prizeSteps, setPrizeSteps] = useState([5, 10, 18]);

    const handleCollectedStampsChange = (event, newValue) => {
        setCollectedStamps(newValue);
    };

    const formSubmissionHandler = async (event) => {
        event.preventDefault();
        console.log('form submitted');

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
    }

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
            />

            <div className={styles.contentContainer}>
                <ContentCard className={styles.cardContainer}>
                    <StampCard 
                        title="Get Free Spiacy Black Whole Leg"
                        description={`Earn a stamp when you spend SGD $10.00`}
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
                                <MuiColorInput className={styles.colorInput} format="hex" value={cardNoStampBorderColor} onChange={(color) => { setCardNoStampBorderColor(color) }} />
                            </div>

                            <div className={styles.field}>
                                <FieldHeader
                                    title='No Stamp Background Color'
                                    type='h3'
                                />
                                <MuiColorInput className={styles.colorInput} format="hex" value={cardNoStampBackgroundColor} onChange={(color) => { setCardNoStampBackgroundColor(color) }} />
                            </div>

                            <div className={styles.field}>
                                <FieldHeader
                                    title='Stamp Border Color'
                                    type='h3'
                                />
                                <MuiColorInput className={styles.colorInput} format="hex" value={cardStampCollectedBorderColor} onChange={(color) => { setCardStampCollectedBorderColor(color) }} />
                            </div>

                            <div className={styles.field}>
                                <FieldHeader
                                    title='Stamp Background Color'
                                    type='h3'
                                />
                                <MuiColorInput className={styles.colorInput} format="hex" value={cardStampBackground} onChange={(color) => { setCardStampBackground(color) }} />
                            </div>

                            <div className={styles.field}>
                                <FieldHeader
                                    title='Checkmark Color'
                                    type='h3'
                                />
                                <MuiColorInput className={styles.colorInput} format="hex" value={checkmarkColor} onChange={(color) => { setCheckmarkColor(color) }} />
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
                                    onChange={(color) => { setCardBackgroundColor(color) }} />
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
                                    onChange={(color) => { setCardTitleColor(color) }} />
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
                                    onChange={(color) => { setCardFooterColor(color) }} />
                            </div>
                        </div>
                    </div>
                </ContentCard>

            </div>
        </form>
    )
};

export default CardDesign;
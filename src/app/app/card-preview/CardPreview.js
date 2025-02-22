'use client';
import styles from './CardPreview.module.css';
import { ContentCard } from "@/components/ContentCard/ContentCard";
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { HeaderSection } from "@/components/HeaderSection/HeaderSection";
import Link from "next/link";
import { MuiColorInput } from 'mui-color-input'
import { useState } from 'react';

const CardPreview = () => {
    const [cardBackground, setCardBackgroundColor] = useState('#ffffff')
    const [cardTitleColor, setCardTitleColor] = useState('#000000')
    const [cardFooterColor, setCardFooterColor] = useState('#a8a8a8')
    const [cardStampBorderColor, setCardStampBorderColor] = useState('#000000')
    const [cardStampBackground, setCardStampBackground] = useState('#ededed')
    const [numberOfColumn, setNumberOfColumn] = useState(5);

    const [numberOfStamp, setNumberOfStamp] = useState(10);


    return (
        <form>
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
                    <div className={styles.card} style={{ backgroundColor: cardBackground }}>
                        <p className={styles.title} style={{ color: cardTitleColor }}>BUY 10 AND GET 1 FOR FREE</p>

                        <div className={styles.stampContainer} style={{ gridTemplateColumns: `repeat(${numberOfColumn}, 1fr)` }}>
                            {
                                Array(numberOfStamp).fill(0).map((_, index) => (
                                    <div key={index} className={styles.stamp} style={{ borderColor: cardStampBorderColor, background: cardStampBackground }}/>
                                ))
                            }
                        </div>

                        <p className={styles.footer} style={{ color: cardFooterColor}}>No Expiry</p>
                    </div>

                    <p className={styles.cardDescription}><Link href='/app/stamp-management'>Modify</Link> number of stamp and stamp icon is at <Link href='/app/stamp-management'>Stamp Management</Link>.</p>
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

                <ContentCard>
                    <div>
                        <FieldHeader
                            title='Stamp Configuration'
                            type='h2'
                        />

                        <div className={styles.cardConfigContainer}>
                            <div className={styles.field}>
                                <FieldHeader
                                    title='Border Color'
                                    type='h3'
                                />
                                <MuiColorInput className={styles.colorInput} format="hex" value={cardStampBorderColor} onChange={(color) => { setCardStampBorderColor(color) }} />
                            </div>

                            <div className={styles.field}>
                                <FieldHeader
                                    title='Background Color'
                                    type='h3'
                                />
                                <MuiColorInput className={styles.colorInput} format="hex" value={cardStampBackground} onChange={(color) => { setCardStampBackground(color) }} />
                            </div>
                        </div>
                    </div>
                </ContentCard>

            </div>
        </form>
    )
};

export default CardPreview;
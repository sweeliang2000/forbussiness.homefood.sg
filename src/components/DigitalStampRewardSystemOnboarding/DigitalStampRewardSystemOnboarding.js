'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './DigitalStampRewardSystemOnboarding.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import Image from 'next/image';
import { Button, Link as MuiLink } from '@mui/material';
import { FaRegLightbulb } from 'react-icons/fa6';
import { PiGear } from 'react-icons/pi';
import { BsGraphUpArrow } from 'react-icons/bs';
import { FaRegHand } from 'react-icons/fa6';
import apiClient from '@/utility/api';
import { STAMP_MANAGEMENT } from '@/utility/apiPaths';

const DigitalStampRewardSystemOnboarding = ({ onSuccess }) => {
    const router = useRouter();
    const [isEnabling, setIsEnabling] = useState(false);

    const handleGetStarted = async () => {
        setIsEnabling(true);
        try {
            const formData = new FormData();
            formData.append('isEnabled', 'true');
            formData.append('cardTitle', '');
            formData.append('cardDescription', '');
            formData.append('termsAndConditions', '');
            formData.append('numberOfStamps', '6');
            formData.append('expirationType', 'validForDays');
            formData.append('numberOfDaysToExpire', '30');
            formData.append('cardStepDetails', '[]');

            await apiClient.post(STAMP_MANAGEMENT, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onSuccess?.();
            router.refresh();
            router.push('/app/stamp-management');
        } catch (err) {
            const errorData = err?.response?.data;
            const msg = errorData?.error?.message || errorData?.message || err?.message || 'Failed to enable';
            console.error(msg);
        } finally {
            setIsEnabling(false);
        }
    };

    return (
        <>
            <div className={styles.headerContainer}>
                <ContentCard className={styles.header}>
                    <div className={styles.headerContent}>
                        <div>
                            <h1>Digital Stamp Reward System</h1>
                            <p className={styles.description}>
                                Get a digital stamp card solution for your shop with fully customisable stamps, 
                                reward tiers (e.g. free upsize at 5 stamps, free drink at 10), and flexible card 
                                expiry rules — designed to keep customers coming back.
                            </p>
                            <div>
                                <MuiLink href='/' component={Link}><FaRegLightbulb /> Learn more</MuiLink>
                            </div>
                        </div>
                        <Button
                            loading={isEnabling}
                            loadingPosition='start'
                            variant='contained'
                            className={styles.button}
                            onClick={handleGetStarted}
                            disabled={isEnabling}
                        >
                            Get Started
                        </Button>
                    </div>
                    <div className={styles.imageContainer}>
                        <Image
                            src='/images/app/stamp-on-boarding.png'
                            width={300}
                            height={300}
                            alt=''
                            className={styles.image}
                            priority
                        />
                    </div>
                </ContentCard>
            </div>

            <div className={styles.detailsContainer}>
                <ContentCard className={styles.content}>
                    <div>
                        <h2>Learn more</h2>
                    </div>
                </ContentCard>

                <ContentCard className={styles.content}>
                    <div className={styles.rows}>
                        <div className={styles.contentRow}>
                            <div className={styles.iconContainer}>
                                <PiGear className={styles.icon} />
                            </div>
                            <div className={styles.rowText}>
                                <p>How do I get started?</p>
                                <label>View the docs</label>
                            </div>
                        </div>

                        <div className={styles.contentRow}>
                            <div className={styles.iconContainer}>
                                <BsGraphUpArrow className={styles.icon} />
                            </div>
                            <div className={styles.rowText}>
                                <p>How can digital stamp help to boost my sales?</p>
                                <label>Learn more</label>
                            </div>
                        </div>

                        <div className={styles.contentRow}>
                            <div className={styles.iconContainer}>
                                <FaRegHand className={styles.icon} />
                            </div>
                            <div className={styles.rowText}>
                                <p>Should I use stamp or points system for my loyalty program?</p>
                                <label>Learn more</label>
                            </div>
                        </div>
                    </div>
{/* 
                    <iframe
                        className={styles.iframe}
                        src='https://www.youtube.com/embed/6muziL6I_kQ?si=QOswW8SadP5E5eTS'
                        title='YouTube video player'
                        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                    /> */}
                </ContentCard>
            </div>
        </>
    );
};

export default DigitalStampRewardSystemOnboarding;

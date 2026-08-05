'use client';

import styles from './ScanToWinOnboarding.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import Image from 'next/image';
import { Button } from '@mui/material';
import { PiGear } from 'react-icons/pi';
import { BsGraphUpArrow } from 'react-icons/bs';
import { FaRegHand } from 'react-icons/fa6';

const ScanToWinOnboarding = ({ onGetStarted, isEnabling }) => {
    return (
        <>
            <div className={styles.headerContainer}>
                <ContentCard className={styles.header}>
                    <div className={styles.headerContent}>
                        <div>
                            <h1>Scan to Win</h1>
                            <p className={styles.description}>
                                Attract new customers to your shop by offering QR-code Scan-to-Win rewards that 
                                turn every visit into an exciting moment. Increase spending from returning customers 
                                by setting reward probabilities, limiting redemptions, and unlocking better rewards at 
                                higher spend or visit milestones.
                            </p>
                        </div>
                        <Button
                            loading={isEnabling}
                            loadingPosition="start"
                            variant="contained"
                            className={styles.button}
                            onClick={onGetStarted}
                            disabled={isEnabling}
                        >
                            Get Started
                        </Button>
                    </div>
                    <div className={styles.imageContainer}>
                        <Image
                            src="/images/app/scan-to-win-boarding.png"
                            width={300}
                            height={300}
                            alt=""
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
                                <p>How can scan to win help to boost my sales?</p>
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

                    {/* <iframe
                        className={styles.iframe}
                        src="https://www.youtube.com/embed/6muziL6I_kQ?si=QOswW8SadP5E5eTS"
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    /> */}
                </ContentCard>
            </div>
        </>
    );
};

export default ScanToWinOnboarding;

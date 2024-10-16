// https://console.stampme.com/stamp-cards/editcard
import { LoadingButton } from '@mui/lab';
import styles from './StampOnboarding.module.css';
import { ContentCard } from "@/components/ContentCard/ContentCard";
import Image from 'next/image';
import { Link } from '@mui/material';
import { FaRegLightbulb } from "react-icons/fa6";
import { PiGear } from "react-icons/pi";
import { BsGraphUpArrow } from "react-icons/bs";
import { FaRegHand } from "react-icons/fa6";

const StampOnBoarding = () => {
    return (
        <>
            <div className={styles.headerContainer}>
                <ContentCard className={styles.header}>
                    <div className={styles.headerContent}>
                        <div>
                            <h1>Digital Stamp Reward System</h1>
                            <p className={styles.description}>
                                Get a digital stamp card solution for your shop with customisable stamps, rewards type (e.g.,
                                free upsize at 5 stamps, free drink at 10) and you card expiry rules.
                            </p>
                            <div>
                                <Link href="/"><FaRegLightbulb /> Learn more</Link>
                            </div>
                        </div>
                        <LoadingButton
                            // onClick={addLocationHandler}
                            // loading={true}
                            // disabled
                            loadingPosition="start"
                            variant="contained"
                            className={styles.button}
                        >
                            Get Started
                        </LoadingButton>
                    </div>
                    <div className={styles.imageContainer}>
                        <Image
                            src='/images/app/stamp-on-boarding.webp'
                            width='300'
                            height='300'
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
                                <PiGear className={styles.icon}/>
                            </div>
                            <div className={styles.rowText}>
                                <p>How do I get started?</p>
                                <label>View the docs</label>
                            </div>
                        </div>

                        <div className={styles.contentRow}>
                            <div className={styles.iconContainer}>
                                <BsGraphUpArrow className={styles.icon}/>
                            </div>
                            <div className={styles.rowText}>
                                <p>How can digital stamp help to boost my sales?</p>
                                <label>Learn more</label>
                            </div>
                        </div>

                        <div className={styles.contentRow}>
                            <div className={styles.iconContainer}>
                                <FaRegHand className={styles.icon}/>
                            </div>
                            <div className={styles.rowText}>
                                <p>Should I use stamp or points system for my loyalty program?</p>
                                <label>Learn more</label>
                            </div>
                        </div>
                    </div>

                    <iframe
                        className={styles.iframe}
                        src="https://www.youtube.com/embed/6muziL6I_kQ?si=QOswW8SadP5E5eTS"
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    ></iframe>

                </ContentCard>
            </div>
        </>
    )
};

export default StampOnBoarding;
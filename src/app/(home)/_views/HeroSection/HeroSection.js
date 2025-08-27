'use client';
import Abutton from '@/components/Buttons/Abutton';
import styles from './HeroSection.module.css';
import Image from 'next/image';
import { motion } from 'framer-motion';

const HeroSection = () => {
    return (
        <motion.section 
            id='hero'
            className={styles.heroSection}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25 }}>

            <motion.div 
                className={styles.heroTopContainer}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.05 }}>
                <div className={styles.heroInfo}>
                    <motion.h1
                        initial={{ y: 50, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}>
                        Turn Customers Into Loyal Fans. <br/>Boost Your Sales.
                    </motion.h1>
                    <motion.p 
                        className={styles.heroSubtitle}
                        initial={{ y: 30, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}>
                        Launch your own loyalty program in minutes. Reward customers, 
                        keep them coming back, and grow your sales — <b>free for your first outlet</b>.
                    </motion.p>
                </div>
                <motion.div 
                    className={styles.heroButtons}
                    initial={{ y: 40, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}>
                    <Abutton 
                        href='/' 
                        variant="outline" 
                        size="medium">
                        Book a consultation
                    </Abutton>
                    <Abutton
                        href='/'
                        variant="primary"
                        size="medium">
                        Start for free
                    </Abutton>
                </motion.div>
            </motion.div>

            <motion.div 
                className={styles.heroBottomContainer}>
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 120 }}
                    className={styles.heroBottomImageContainer}
                    >
                    <Image
                        className={styles.heroBottomCardImage}
                        src='/images/pages/landing/hero/card.webp'
                        alt='Hero Bottom'
                        width={380}
                        height={280}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 120 }}
                    >
                    <Image
                        className={styles.heroBottomImage}
                        src='/images/pages/landing/hero/collbine_app.png'
                        alt='Hero Bottom'
                        width={280}
                        height={600}
                    />
                </motion.div>
            </motion.div>

        </motion.section>
    );
};

export default HeroSection;
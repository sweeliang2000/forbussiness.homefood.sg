'use client';
import Abutton from '@/components/Buttons/Abutton';
import styles from './HeroSection.module.css';
import Image from 'next/image';
import { motion } from 'framer-motion';
import TransactionChart from './TransactionChart';
import AnimatedCardDisplay from './AnimatedCardDisplay';

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
                className={styles.heroRightContainer}>
                <div className={styles.div1}>
                    <Image
                        src="/images/pages/landing/hero/collbine-scan-to-win-poster.png"
                        alt="Collbine App"
                        fill
                        className={styles.div1Image}
                        priority
                    />
                </div>
                <div className={styles.div2}>
                    <AnimatedCardDisplay />
                </div>
                <div className={styles.div3}>
                    <TransactionChart />
                </div>
            </motion.div>

        </motion.section>
    );
};

export default HeroSection;
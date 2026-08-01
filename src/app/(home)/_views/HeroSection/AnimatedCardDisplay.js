'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HeroSection.module.css';

const cardImages = [
    { 
        src: '/images/pages/landing/card example/car washes card - homefood.png', 
        alt: 'Car Washes Loyalty Card' 
    },
    { 
        src: '/images/pages/landing/card example/dessert card - homefood.png', 
        alt: 'Dessert Loyalty Card' 
    },
    { 
        src: '/images/pages/landing/card example/lunch card - homefood.png', 
        alt: 'Lunch Loyalty Card' 
    },
];

const AnimatedCardDisplay = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % cardImages.length);
        }, 3000); // Change image every 3 seconds

        return () => clearInterval(interval);
    }, []);

    const currentImage = cardImages[currentIndex];

    return (
        <div className={styles.animatedCardContainer}>
            <h3 className={styles.animatedCardTitle}>Loyalty card for any service</h3>
            <div className={styles.animatedCardWrapper}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1}}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 1.5, ease: 'easeInOut' }}
                        className={styles.animatedCardImageHolder}
                    >
                        <Image
                            src={currentImage.src}
                            alt={currentImage.alt}
                            width={300}
                            height={400}
                            className={styles.animatedCardImage}
                            priority={currentIndex === 0}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AnimatedCardDisplay;


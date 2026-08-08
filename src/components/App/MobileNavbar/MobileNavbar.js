'use client';
import { useEffect, useState } from 'react';
import HomeFoodForBusiness from '@/components/HomeFoodForBusiness/HomeFoodForBusiness';
import styles from './MobileNavbar.module.css';

const MobileNavbar = ({
    isMenuOpen,
    toggleMenu,
    controls,
    className
}) => {
    const [isScrolled, setIsScrolled] = useState(false);

    // The hairline under the bar is a scroll edge, not a permanent rule: it
    // only earns its place once there's content passing underneath to
    // separate from.
    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 2);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <nav className={`${styles.nav} ${isScrolled ? styles.scrolled : ''} ${className || ''}`}>
            <button
                type="button"
                className={styles.menuButton}
                onClick={toggleMenu}
                aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMenuOpen}
                aria-controls={controls}
            >
                {/*
                  One glyph that morphs rather than two that swap. The bars
                  converge on the centre and cross, so the icon shows the
                  drawer's state changing instead of cutting to it.
                */}
                <svg
                    className={`${styles.menuIcon} ${isMenuOpen ? styles.menuIconOpen : ''}`}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                >
                    <line className={styles.barTop} x1="3.75" y1="7.25" x2="20.25" y2="7.25" />
                    <line className={styles.barMid} x1="3.75" y1="12" x2="20.25" y2="12" />
                    <line className={styles.barBottom} x1="3.75" y1="16.75" x2="20.25" y2="16.75" />
                </svg>
            </button>
            <HomeFoodForBusiness />
        </nav>
    );
};

export default MobileNavbar;

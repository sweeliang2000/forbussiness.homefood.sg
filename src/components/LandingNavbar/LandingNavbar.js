'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './LandingNavbar.module.css';
import HomeFoodForBusiness from '@/components/HomeFoodForBusiness/HomeFoodForBusiness';
import Abutton from '@/components/Buttons/Abutton';
import { IoMdClose } from "react-icons/io";
import { AiOutlineMenu } from "react-icons/ai";
import { FaAngleRight, FaTiktok, FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Notification from '@/components/Notification';
import { motion } from 'motion/react';
import { getNotificationConfig, db } from '@/utility/firebaseClient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDismissedNotification, setDismissedNotification, shouldShowNotification } from '@/utility/notificationStorage';
import apiClient from '@/utility/api';
import { REFRESH_USER_COOKIE } from '@/utility/apiPaths';

const menuItems = [
    { label: 'Why HomeFood', href: '#why' },
    { label: 'What we offer', href: '#offer' },
    { label: 'How it works', href: '#how' },
    { label: 'Payments', href: '#payments' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
];

const login = { label: 'Log in', href: '/login' };
const signup = { label: 'Join early adopters', href: '/early-adopter' };
const consoleCta = { label: 'Console', href: '/app' };

const LandingNavbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);
    const [notificationConfig, setNotificationConfig] = useState(null);
    // null = unknown yet (avoid showing wrong CTAs while we check)
    const [isLoggedIn, setIsLoggedIn] = useState(null);

    // Waitlist modal state
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [waitlistForm, setWaitlistForm] = useState({ name: '', phone: '', email: '' });
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
    const [waitlistError, setWaitlistError] = useState('');

    // Fetch notification config from Remote Config on mount
    useEffect(() => {
        const fetchNotificationConfig = async () => {
            try {
                console.log('[LANDING NAVBAR] Fetching notification config...');
                const config = await getNotificationConfig();
                console.log('[LANDING NAVBAR] Received config:', config);
                
                if (!config) {
                    console.log('[LANDING NAVBAR] No config received, hiding notification');
                    setIsNotificationVisible(false);
                    return;
                }

                // Check if notification should be shown
                if (!config.is_shown) {
                    console.log('[LANDING NAVBAR] is_shown is false, hiding notification');
                    setIsNotificationVisible(false);
                    return;
                }

                // Check localStorage for dismissal status
                const dismissedTimestamp = getDismissedNotification(config.id);
                console.log('[LANDING NAVBAR] Dismissed timestamp:', dismissedTimestamp);
                const shouldShow = shouldShowNotification(config.id, dismissedTimestamp);
                console.log('[LANDING NAVBAR] Should show notification:', shouldShow);

                if (shouldShow) {
                    console.log('[LANDING NAVBAR] Showing notification with config:', config);
                    setNotificationConfig(config);
                    setIsNotificationVisible(true);
                } else {
                    console.log('[LANDING NAVBAR] Not showing notification (dismissed or expired)');
                    setIsNotificationVisible(false);
                }
            } catch (error) {
                console.error('[LANDING NAVBAR] Failed to fetch notification config:', error);
                setIsNotificationVisible(false);
            }
        };

        fetchNotificationConfig();
    }, []);

    // Check auth on mount so we can show "Console" instead of Login/Signup when authenticated.
    useEffect(() => {
        let isCancelled = false;

        const checkAuth = async () => {
            try {
                await apiClient.get(REFRESH_USER_COOKIE);
                if (!isCancelled) setIsLoggedIn(true);
            } catch (_) {
                if (!isCancelled) setIsLoggedIn(false);
            }
        };

        checkAuth();

        return () => {
            isCancelled = true;
        };
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleNotificationClose = () => {
        if (notificationConfig?.id) {
            // Save dismissal timestamp to localStorage
            setDismissedNotification(notificationConfig.id);
        }
        setIsNotificationVisible(false);
    };

    const openWaitlist = (e) => {
        e.preventDefault();
        setIsMenuOpen(false);
        setIsWaitlistOpen(true);
    };

    const closeWaitlist = () => {
        setIsWaitlistOpen(false);
        // Reset form after close animation
        setTimeout(() => {
            setWaitlistForm({ name: '', phone: '', email: '' });
            setWaitlistSubmitted(false);
            setWaitlistError('');
        }, 200);
    };

    const handleWaitlistChange = (e) => {
        setWaitlistForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleWaitlistSubmit = async (e) => {
        e.preventDefault();
        setWaitlistError('');
        setWaitlistLoading(true);
        try {
            await addDoc(collection(db, 'early_adopters'), {
                name: waitlistForm.name.trim(),
                phone: waitlistForm.phone.trim(),
                email: waitlistForm.email.trim().toLowerCase(),
                createdAt: serverTimestamp(),
            });
            setWaitlistSubmitted(true);
        } catch (err) {
            console.error('[Waitlist] Firestore error:', err);
            setWaitlistError('Something went wrong. Please try again.');
        } finally {
            setWaitlistLoading(false);
        }
    };

    return (
        <>
            <nav className={styles.navbar}>
                {isNotificationVisible && notificationConfig && (
                    <Notification
                        message={notificationConfig.message}
                        href={notificationConfig.url}
                        variant="success"
                        onClose={handleNotificationClose}
                        isVisible={isNotificationVisible}
                    />
                )}

                <div className={styles.navContainer}>
                    {/* Logo */}
                    <Link className={styles.logo} href="/" aria-label="HomeFood for Business home">
                        <HomeFoodForBusiness />
                    </Link>

                    {/* Desktop Menu */}
                    <div className={styles.desktopMenu}>
                        {menuItems.map((item, index) => (
                            <a
                                key={index}
                                href={item.href}
                                className={styles.navLink}
                                target={item.external ? "_blank" : undefined}
                                rel={item.external ? "noopener noreferrer" : undefined}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className={styles.ctaButtons}>
                        {isLoggedIn === true ? (
                            <Abutton href={consoleCta.href} variant="primary" size="medium">
                                {consoleCta.label}
                            </Abutton>
                        ) : isLoggedIn === false ? (
                            <>
                                <Abutton href="#" variant="ghost" size="medium" onClick={openWaitlist}>
                                    {login.label}
                                </Abutton>
                                <Abutton href={signup.href} variant="primary" size="medium">
                                    {signup.label}
                                </Abutton>
                            </>
                        ) : null}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className={styles.mobileMenuToggle} onClick={toggleMenu}>
                        {isMenuOpen ? (
                            <IoMdClose className={styles.menuIcon} />
                        ) : (
                            <AiOutlineMenu className={styles.menuIcon} />
                        )}
                    </button>
                </div>

            </nav>
            {/* Mobile Menu */}
            <div 
                className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ''}`}
                style={{
                    paddingTop: isNotificationVisible ? '64px' : '32px'
                }}
            >
                <div className={styles.mobileMenuItems}>
                    {menuItems.map((item, index) => (
                        <a
                            key={index}
                            href={item.href}
                            className={styles.mobileNavLink}
                            target={item.external ? "_blank" : undefined}
                            rel={item.external ? "noopener noreferrer" : undefined}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <span>{item.label}</span>
                            <FaAngleRight />
                        </a>
                    ))}

                    <div className={styles.mobileCtaButtons}>
                        {isLoggedIn === true ? (
                            <Abutton href={consoleCta.href} variant="primary" size="medium">
                                {consoleCta.label}
                            </Abutton>
                        ) : isLoggedIn === false ? (
                            <>
                                <Abutton href="#" variant="secondary" size="medium" onClick={openWaitlist}>
                                    {login.label}
                                </Abutton>
                                <Abutton href={signup.href} variant="primary" size="medium">
                                    {signup.label}
                                </Abutton>
                            </>
                        ) : null}
                    </div>

                    <div className={styles.socialMediaIcons}>
                        <a href="#" className={styles.socialIcon} aria-label="TikTok">
                            <FaTiktok />
                        </a>
                        <a href="#" className={styles.socialIcon} aria-label="Facebook">
                            <FaFacebookF />
                        </a>
                        <a href="#" className={styles.socialIcon} aria-label="Instagram">
                            <FaInstagram />
                        </a>
                        <a href="#" className={styles.socialIcon} aria-label="X (Twitter)">
                            <FaXTwitter />
                        </a>
                    </div>
                </div>
            </div>
            {/* Waitlist modal */}
            {isWaitlistOpen && (
                <div className={styles.modalOverlay} onClick={closeWaitlist}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.modalClose} onClick={closeWaitlist} aria-label="Close">
                            <IoMdClose />
                        </button>

                        {waitlistSubmitted ? (
                            <div className={styles.modalSuccess}>
                                <div className={styles.modalSuccessIcon}>🎉</div>
                                <h2 className={styles.modalSuccessTitle}>You&apos;re on the list!</h2>
                                <p className={styles.modalSuccessSub}>
                                    We&apos;ll reach out as soon as we&apos;re ready to set you up on HomeFood. Stay tuned!
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.modalHeader}>
                                    <span className={styles.modalBadge}>Coming soon</span>
                                    <h2 className={styles.modalTitle}>We&apos;re building something great</h2>
                                    <p className={styles.modalSub}>
                                        Join the waitlist now and we&apos;ll contact you as soon as we&apos;re ready to get you set up.
                                    </p>
                                </div>
                                <form className={styles.modalForm} onSubmit={handleWaitlistSubmit}>
                                    <div className={styles.modalField}>
                                        <label className={styles.modalLabel} htmlFor="wl-name">Name</label>
                                        <input
                                            id="wl-name"
                                            className={styles.modalInput}
                                            type="text"
                                            name="name"
                                            placeholder="Your full name"
                                            value={waitlistForm.name}
                                            onChange={handleWaitlistChange}
                                            required
                                        />
                                    </div>
                                    <div className={styles.modalField}>
                                        <label className={styles.modalLabel} htmlFor="wl-phone">Phone number</label>
                                        <input
                                            id="wl-phone"
                                            className={styles.modalInput}
                                            type="tel"
                                            name="phone"
                                            placeholder="+65 9123 4567"
                                            value={waitlistForm.phone}
                                            onChange={handleWaitlistChange}
                                            required
                                        />
                                    </div>
                                    <div className={styles.modalField}>
                                        <label className={styles.modalLabel} htmlFor="wl-email">Email address</label>
                                        <input
                                            id="wl-email"
                                            className={styles.modalInput}
                                            type="email"
                                            name="email"
                                            placeholder="you@example.com"
                                            value={waitlistForm.email}
                                            onChange={handleWaitlistChange}
                                            required
                                        />
                                    </div>
                                    {waitlistError && <p className={styles.modalError}>{waitlistError}</p>}
                                    <button
                                        type="submit"
                                        className={styles.modalSubmit}
                                        disabled={waitlistLoading}
                                    >
                                        {waitlistLoading ? 'Submitting…' : 'Join the waitlist →'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default LandingNavbar;

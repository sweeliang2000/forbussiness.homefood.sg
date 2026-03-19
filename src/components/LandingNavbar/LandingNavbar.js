'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './LandingNavbar.module.css';
import CollbineForBusiness from '@/components/CollbineForBusiness/CollbineForBusiness';
import Abutton from '@/components/Buttons/Abutton';
import { IoMdClose } from "react-icons/io";
import { AiOutlineMenu } from "react-icons/ai";
import { FaAngleRight, FaTiktok, FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Notification from '@/components/Notification';
import { motion } from 'motion/react';
import { getNotificationConfig } from '@/utility/firebaseClient';
import { getDismissedNotification, setDismissedNotification, shouldShowNotification } from '@/utility/notificationStorage';
import apiClient from '@/utility/api';
import { REFRESH_USER_COOKIE } from '@/utility/apiPaths';

const menuItems = [
    { label: 'Why Collbine', href: '#why' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Get Started', href: 'https://guide.collbine.com/', external: true },
    { label: 'Contact', href: '#contact' }
];

const login = { label: 'Login', href: '/login' };
const signup = { label: 'Sign up for free', href: '/signup' };
const consoleCta = { label: 'Console', href: '/app' };

const LandingNavbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);
    const [notificationConfig, setNotificationConfig] = useState(null);
    // null = unknown yet (avoid showing wrong CTAs while we check)
    const [isLoggedIn, setIsLoggedIn] = useState(null);

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
                    <Link className={styles.logo} href="/">
                        <CollbineForBusiness />
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
                                <Abutton href={login.href} variant="ghost" size="medium">
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
                                <Abutton href={login.href} variant="secondary" size="medium">
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
        </>
    );
};

export default LandingNavbar;

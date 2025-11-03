'use client';
import { useState } from 'react';
import styles from './LandingNavbar.module.css';
import CollbineForBusiness from '@/components/CollbineForBusiness/CollbineForBusiness';
import Abutton from '@/components/Buttons/Abutton';
import { IoMdClose } from "react-icons/io";
import { AiOutlineMenu } from "react-icons/ai";
import { FaAngleRight, FaTiktok, FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Notification from '@/components/Notification';
import { motion } from 'motion/react';

const menuItems = [
    { label: 'Why us?', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'Get Started', href: '#about' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' }
];

const login = { label: 'Login', href: '/login' };
const signup = { label: 'Sign up for free', href: '/signup' };

const LandingNavbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationVisible, setIsNotificationVisible] = useState(true);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleNotificationClose = () => {
        setIsNotificationVisible(false);
    };

    return (
        <>
            <nav className={styles.navbar}>
                {isNotificationVisible && (
                    <Notification
                        message="🎉 New Feature: Advanced Analytics Dashboard Now Available!"
                        href="/app/analytics"
                        variant="success"
                        onClose={handleNotificationClose}
                        isVisible={isNotificationVisible}
                    />
                )}

                <div className={styles.navContainer}>
                    {/* Logo */}
                    <a className={styles.logo} href="/">
                        <CollbineForBusiness />
                    </a>

                    {/* Desktop Menu */}
                    <div className={styles.desktopMenu}>
                        {menuItems.map((item, index) => (
                            <a key={index} href={item.href} className={styles.navLink}>
                                {item.label}
                            </a>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className={styles.ctaButtons}>
                        <Abutton href={login.href} variant="ghost" size="medium">
                            { login.label }
                        </Abutton>
                        <Abutton href={signup.href} variant="primary" size="medium">
                            { signup.label }
                        </Abutton>
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
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <span>{item.label}</span>
                            <FaAngleRight />
                        </a>
                    ))}

                    <div className={styles.mobileCtaButtons}>
                        <Abutton href={login.href} variant="secondary" size="medium">
                            { login.label }
                        </Abutton>
                        <Abutton href={signup.href} variant="primary" size="medium">
                            { signup.label }
                        </Abutton>
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

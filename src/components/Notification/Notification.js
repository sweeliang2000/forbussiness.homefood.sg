'use client';
import { useState } from 'react';
import styles from './Notification.module.css';
import { IoCloseSharp } from 'react-icons/io5';

const Notification = ({ 
    message, 
    href = "#", 
    variant = "success",
    onClose,
    isVisible = true,
    className = ""
}) => {
    const [visible, setVisible] = useState(isVisible);

    const handleClose = (e) => {
        e.preventDefault();
        setVisible(false);
        if (onClose) {
            onClose();
        }
    };

    if (!visible) return null;

    return (
        <div className={`${styles.notification} ${styles[variant]} ${className}`}>
            <div className={styles.content}>
                <a href={href} className={styles.messageLink}>
                    {message}
                </a>
            </div>
            <a 
                href="#" 
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Close notification"
            >
                <IoCloseSharp className={styles.closeIcon} />
            </a>
        </div>
    );
};

export default Notification;

'use client';
import { useState } from 'react';
import styles from './notifications.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { Button } from '@mui/material';
import { FaChevronRight, FaArrowUp } from 'react-icons/fa';
import { 
    MdOutlineNotificationsActive, 
    MdOutlineCheckCircle,
    MdOutlineWarning,
    MdOutlineInfo,
    MdOutlineStars
} from 'react-icons/md';

const NotificationsView = () => {
    // Template data for common notification types
    const initialNotifications = [
        {
            id: 1,
            type: 'system',
            title: 'System Update Available',
            message: 'A new version of the app is available. Update now to get the latest features and improvements.',
            timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            isRead: false,
            icon: MdOutlineNotificationsActive,
            priority: 'high'
        },
        {
            id: 2,
            type: 'success',
            title: 'Release Approved',
            message: 'Your release submission version 1.2.0 has been approved and is now live.',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            isRead: false,
            icon: MdOutlineCheckCircle,
            priority: 'high',
            href: '/app/release/status'
        },
        {
            id: 3,
            type: 'warning',
            title: 'Subscription Expiring Soon',
            message: 'Your premium subscription will expire in 7 days. Renew now to continue enjoying all features.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            isRead: false,
            icon: MdOutlineWarning,
            priority: 'medium',
            href: '/app/subscription'
        },
        {
            id: 4,
            type: 'info',
            title: 'New Reward Created',
            message: 'You have successfully created a new reward "Free Coffee" in your rewards catalog.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
            isRead: true,
            icon: MdOutlineInfo,
            priority: 'low',
            href: '/app/redeemable/rewards'
        },
        {
            id: 5,
            type: 'success',
            title: 'New Review Received',
            message: 'John Doe left a 5-star rating and review for your business. View it now.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
            isRead: true,
            icon: MdOutlineStars,
            priority: 'medium',
            href: '/app/ratings'
        },
        {
            id: 6,
            type: 'system',
            title: 'Maintenance Scheduled',
            message: 'Scheduled maintenance will occur on January 20, 2024 from 2:00 AM to 4:00 AM. Some features may be temporarily unavailable.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            isRead: true,
            icon: MdOutlineInfo,
            priority: 'low'
        },
        {
            id: 7,
            type: 'warning',
            title: 'Low Inventory Alert',
            message: 'Your reward "Free Donut" is running low on inventory. Consider updating the stock.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
            isRead: true,
            icon: MdOutlineWarning,
            priority: 'medium',
            href: '/app/redeemable/rewards'
        },
        {
            id: 8,
            type: 'success',
            title: 'New User Registered',
            message: '5 new customers have registered in the last 24 hours.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
            isRead: true,
            icon: MdOutlineCheckCircle,
            priority: 'low'
        }
    ];

    const [notifications, setNotifications] = useState(initialNotifications);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAllAsRead = () => {
        setNotifications(prevNotifications => 
            prevNotifications.map(notification => ({
                ...notification,
                isRead: true
            }))
        );
    };

    const getNotificationTypeClass = (type) => {
        const typeMap = {
            'system': styles.system,
            'success': styles.success,
            'warning': styles.warning,
            'info': styles.info,
            'error': styles.error
        };
        return typeMap[type] || styles.info;
    };

    const formatTimestamp = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp.getTime();
        const oneMinute = 1000 * 60;
        const oneHour = 1000 * 60 * 60;
        const oneDay = 1000 * 60 * 60 * 24;

        if (diff < oneMinute) {
            return 'Just now';
        } else if (diff < oneHour) {
            const minutes = Math.floor(diff / oneMinute);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (diff < oneDay) {
            const hours = Math.floor(diff / oneHour);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diff / oneDay);
            if (days === 1) return 'Yesterday';
            if (days < 7) return `${days} days ago`;
            
            // Format date for older notifications
            const date = timestamp;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <form
            className={styles.form}
            onSubmit={() => { }}
        >
            <HeaderSection
                className={styles.header}
                title='Notifications'
                description={
                    <p>
                        Stay updated with important alerts and activities.
                    </p>
                }
            />

            <ContentCard className={styles.summaryCard}>
                <div className={styles.summaryContent}>
                    <div className={styles.summaryInfo}>
                        <span className={styles.summaryLabel}>Unread notifications:</span>
                        <span className={styles.unreadCount}>{unreadCount}</span>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant='contained'
                            size='small'
                            onClick={handleMarkAllAsRead}
                            className={styles.markAllReadButton}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
            </ContentCard>

            <ContentCard className={styles.content}>
                <div className={styles.notificationsHeader}>
                    <FieldHeader
                        title='All Notifications'
                        type='h3'
                    />
                </div>

                <div className={styles.notificationsList}>
                    {notifications.map((notification) => {
                        const IconComponent = notification.icon;
                        const notificationClass = `${styles.notificationItem} ${!notification.isRead ? styles.unread : ''} ${getNotificationTypeClass(notification.type)}`;
                        
                        const content = (
                            <>
                                <div className={styles.notificationContent}>
                                    <div className={styles.notificationIconWrapper}>
                                        <IconComponent className={styles.notificationIcon} />
                                    </div>
                                    <div className={styles.notificationText}>
                                        <div className={styles.notificationHeader}>
                                            <h4 className={styles.notificationTitle}>{notification.title}</h4>
                                            {!notification.isRead && <span className={styles.unreadDot}></span>}
                                        </div>
                                        <p className={styles.notificationMessage}>{notification.message}</p>
                                        <span className={styles.notificationTime}>{formatTimestamp(notification.timestamp)}</span>
                                    </div>
                                </div>
                                <FaChevronRight className={styles.chevron} />
                            </>
                        );

                        if (notification.href) {
                            return (
                                <Link
                                    key={notification.id}
                                    href={notification.href}
                                    className={notificationClass}
                                >
                                    {content}
                                </Link>
                            );
                        }

                        return (
                            <div
                                key={notification.id}
                                className={notificationClass}
                            >
                                {content}
                            </div>
                        );
                    })}
                </div>
            </ContentCard>

            <div className={styles.endOfNotifications}>
                <p className={styles.endMessage}>End of notifications</p>
            </div>

            <div className={styles.scrollToTopContainer}>
                <Button
                    variant='contained'
                    onClick={scrollToTop}
                    className={styles.scrollToTopButton}
                    aria-label="Scroll to top"
                >
                    <FaArrowUp className={styles.scrollToTopIcon} />
                    <span>Back to top</span>
                </Button>
            </div>

        </form>
    )
};

export default NotificationsView;

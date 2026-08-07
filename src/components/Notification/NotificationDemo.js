'use client';
import { useState } from 'react';
import Notification from './Notification';
import Abutton from '@/components/Buttons/Abutton';
import styles from './NotificationDemo.module.css';

const NotificationDemo = () => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (variant, message, href = "#") => {
        const id = Date.now();
        const newNotification = {
            id,
            variant,
            message,
            href,
            isVisible: true
        };
        
        setNotifications(prev => [...prev, newNotification]);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const notificationExamples = [
        { variant: 'success', message: 'Success! Your account has been created successfully!' },
        { variant: 'info', message: 'New features are now available in your dashboard!' },
        { variant: 'warning', message: 'Your subscription expires in 3 days. Renew now!' },
        { variant: 'error', message: 'Error: Unable to save changes. Please try again.' },
        { variant: 'light', message: 'Maintenance scheduled for tonight 11 PM - 1 AM EST' },
        { variant: 'dark', message: 'Premium features unlocked! Explore new possibilities.' }
    ];

    return (
        <div className={styles.demo}>
            <h2>Notification Component Demo</h2>
            <p>Click the buttons below to see different notification variants:</p>
            
            <div className={styles.buttonGrid}>
                {notificationExamples.map((example, index) => (
                    <Abutton
                        key={index}
                        variant={`outline-${example.variant === 'light' ? 'secondary' : example.variant === 'dark' ? 'secondary' : example.variant}`}
                        size="medium"
                        onClick={(e) => {
                            e.preventDefault();
                            addNotification(example.variant, example.message, '/demo');
                        }}
                    >
                        Show {example.variant.charAt(0).toUpperCase() + example.variant.slice(1)}
                    </Abutton>
                ))}
            </div>

            {/* Render notifications */}
            <div className={styles.notificationContainer}>
                {notifications.map((notification, index) => (
                    <div 
                        key={notification.id} 
                        style={{ top: `${index * 50}px` }}
                        className={styles.notificationWrapper}
                    >
                        <Notification
                            message={notification.message}
                            href={notification.href}
                            variant={notification.variant}
                            isVisible={notification.isVisible}
                            onClose={() => removeNotification(notification.id)}
                        />
                    </div>
                ))}
            </div>

            <div className={styles.codeExample}>
                <h3>Usage Example:</h3>
                <pre><code>{`<Notification 
  message="Success! Your action was completed!" 
  href="/dashboard"
  variant="success"
  onClose={() => console.log('Notification closed')}
/>`}</code></pre>
            </div>
        </div>
    );
};

export default NotificationDemo;

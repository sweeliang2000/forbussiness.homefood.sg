'use client';
import { useState } from 'react';
import TerminalControlPanel from './TerminalControlPanel';
import CustomerPhoneNumberControlPanel from './CustomerPhoneNumberControlPanel';
// Removed direct Supabase client import - using API route instead
import styles from './page.module.css';

const TerminalPage = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerBirthday, setCustomerBirthday] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handlePhoneNumberSubmit = async (phone) => {
        setPhoneNumber(phone);
        setIsLoading(true);
        setError(null);
        setCustomerName('');
        setCustomerBirthday('');

        try {
            // Call API route instead of direct Supabase client
            const response = await fetch(`/api/terminal/customer?phone=${encodeURIComponent(phone)}`);
            
            if (response.status === 404) {
                // Customer not found
                setError('not_found');
                setCustomerName('');
                setCustomerBirthday('');
            } else if (!response.ok) {
                // Other error (401, 500, etc.)
                const errorData = await response.json().catch(() => ({}));
                console.error('API error:', errorData);
                if (response.status === 401) {
                    setError('unauthorized');
                } else {
                    setError('error');
                }
                setCustomerName('');
                setCustomerBirthday('');
            } else {
                // Success
                const customerData = await response.json();
                setCustomerName(customerData.name || '');
                setCustomerBirthday(customerData.birthday || '');
                setError(null);
            }
        } catch (err) {
            console.error('Error fetching customer:', err);
            console.error('Error details:', {
                message: err.message,
                status: err.status,
                code: err.code,
                details: err
            });
            // Check if it's a 401 unauthorized error
            if (err.message?.includes('401') || err.status === 401 || err.message?.includes('Unauthorized')) {
                setError('unauthorized');
            } else {
                setError('error');
            }
            setCustomerName('');
            setCustomerBirthday('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeCustomer = () => {
        setPhoneNumber('');
        setCustomerName('');
        setCustomerBirthday('');
        setError(null);
    };

    return (
        <div className={styles.container}>
            {/* Left Side */}
            <div className={styles.leftSide}>
                {phoneNumber ? (
                    <div className={styles.customerNavbar}>
                        <div className={styles.customerInfo}>
                            <div className={styles.customerDetails}>
                                {isLoading ? (
                                    <p className={styles.loadingText}>Loading customer information...</p>
                                ) : error === 'not_found' ? (
                                    <div className={styles.errorContainer}>
                                        <p className={styles.errorTitle}>Collbine Account Not Created</p>
                                        <p className={styles.errorMessage}>
                                            This phone number is not associated with a Collbine account. 
                                            Please inform the customer to download the Collbine app to view loyalty information.
                                        </p>
                                        <p className={styles.customerPhone}>{phoneNumber}</p>
                                    </div>
                                ) : error === 'unauthorized' ? (
                                    <div className={styles.errorContainer}>
                                        <p className={styles.errorTitle}>Authentication Error</p>
                                        <p className={styles.errorMessage}>
                                            Unable to access customer database. Please check Supabase configuration and permissions.
                                        </p>
                                        <p className={styles.customerPhone}>{phoneNumber}</p>
                                    </div>
                                ) : error === 'error' ? (
                                    <div className={styles.errorContainer}>
                                        <p className={styles.errorTitle}>Error Loading Customer</p>
                                        <p className={styles.errorMessage}>
                                            Unable to retrieve customer information. Please try again.
                                        </p>
                                        <p className={styles.customerPhone}>{phoneNumber}</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className={styles.customerName}>{customerName || 'N/A'}</p>
                                        <p className={styles.customerPhone}>{phoneNumber}</p>
                                        {customerBirthday && (
                                            <p className={styles.customerBirthday}>
                                                Birthday: {(() => {
                                                    try {
                                                        const date = new Date(customerBirthday);
                                                        if (isNaN(date.getTime())) {
                                                            return customerBirthday; // Return as-is if invalid date
                                                        }
                                                        return date.toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        });
                                                    } catch (e) {
                                                        return customerBirthday;
                                                    }
                                                })()}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <button 
                            className={styles.changeCustomerButton}
                            onClick={handleChangeCustomer}
                        >
                            Change Customer
                        </button>
                    </div>
                ) : (
                    <h1>Terminal</h1>
                )}
                {/* Left side content can be added here */}
            </div>

            {/* Right Side */}
            {phoneNumber && !error ? (
                <TerminalControlPanel />
            ) : (
                <CustomerPhoneNumberControlPanel onPhoneNumberSubmit={handlePhoneNumberSubmit} />
            )}
        </div>
    );
};

export default TerminalPage;
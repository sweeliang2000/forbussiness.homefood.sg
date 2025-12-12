'use client';
import { useState } from 'react';
import TerminalControlPanel from './TerminalControlPanel';
import CustomerPhoneNumberControlPanel from './CustomerPhoneNumberControlPanel';
import styles from './page.module.css';

const TerminalPage = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [customerName] = useState('John Doe'); // Hardcoded for now

    const handlePhoneNumberSubmit = (phone) => {
        setPhoneNumber(phone);
    };

    const handleChangeCustomer = () => {
        setPhoneNumber('');
    };

    return (
        <div className={styles.container}>
            {/* Left Side */}
            <div className={styles.leftSide}>
                {phoneNumber ? (
                    <div className={styles.customerNavbar}>
                        <div className={styles.customerInfo}>
                            <div className={styles.customerDetails}>
                                <p className={styles.customerName}>{customerName}</p>
                                <p className={styles.customerPhone}>{phoneNumber}</p>
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
            {phoneNumber ? (
                <TerminalControlPanel />
            ) : (
                <CustomerPhoneNumberControlPanel onPhoneNumberSubmit={handlePhoneNumberSubmit} />
            )}
        </div>
    );
};

export default TerminalPage;
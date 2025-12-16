'use client';
import { useState } from 'react';
import { Button, TextField, InputAdornment } from '@mui/material';
import { IoBackspace } from 'react-icons/io5';
import Image from 'next/image';
import styles from './CustomerPhoneNumberControlPanel.module.css';

const CustomerPhoneNumberControlPanel = ({ onPhoneNumberSubmit }) => {
    const [phoneNumber, setPhoneNumber] = useState('');

    const handlePhoneNumberChange = (event) => {
        const value = event.target.value;
        // Allow only digits, spaces, -, and parentheses (no + since it's a prefix)
        if (/^[\d\s\-\(\)]*$/.test(value)) {
            setPhoneNumber(value);
        }
    };

    const handleNumberPadClick = (digit) => {
        setPhoneNumber(prev => prev + digit);
    };

    const handleBackspace = () => {
        if (phoneNumber.length > 0) {
            setPhoneNumber(prev => prev.slice(0, -1));
        }
    };

    const handleClear = () => {
        setPhoneNumber('');
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (phoneNumber.trim()) {
            // Prepend +65 to the phone number when submitting
            onPhoneNumberSubmit('+65' + phoneNumber.trim());
        }
    };

    return (
        <div className={styles.rightSide}>
            <div className={styles.rightContent}>
                <div className={styles.logoContainer}>
                    <Image
                        src="/images/collbine.png"
                        alt="Collbine Logo"
                        width={100}
                        height={100}
                        className={styles.logo}
                    />
                </div>
                <div className={styles.header}>
                    <h2 className={styles.title}>Enter Customer Phone Number</h2>
                    <p className={styles.subtitle}>Enter the customer&apos;s phone number to continue</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputSection}>
                        <TextField
                            variant="outlined"
                            fullWidth
                            type="tel"
                            placeholder="9123 4567"
                            value={phoneNumber}
                            onChange={handlePhoneNumberChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <span className={styles.prefix}>+65</span>
                                    </InputAdornment>
                                ),
                            }}
                            inputProps={{
                                style: {
                                    fontSize: '1.5rem',
                                    padding: '1rem',
                                    textAlign: 'left',
                                },
                            }}
                            autoFocus
                        />
                    </div>

                    {/* Number Pad */}
                    <div className={styles.numberPad}>
                        <div className={styles.numberPadRow}>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('7')}>7</button>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('8')}>8</button>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('9')}>9</button>
                        </div>
                        <div className={styles.numberPadRow}>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('4')}>4</button>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('5')}>5</button>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('6')}>6</button>
                        </div>
                        <div className={styles.numberPadRow}>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('1')}>1</button>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('2')}>2</button>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('3')}>3</button>
                        </div>
                        <div className={styles.numberPadRow}>
                            <button type="button" className={`${styles.numberPadButton} ${styles.operatorButton}`} onClick={handleClear}>C</button>
                            <button type="button" className={styles.numberPadButton} onClick={() => handleNumberPadClick('0')}>0</button>
                            <button type="button" className={`${styles.numberPadButton} ${styles.operatorButton}`} onClick={handleBackspace}>
                                <IoBackspace />
                            </button>
                        </div>
                    </div>

                    <div className={styles.submitButton}>
                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            type="submit"
                            disabled={!phoneNumber.trim()}
                            className={styles.button}
                        >
                            Continue
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerPhoneNumberControlPanel;


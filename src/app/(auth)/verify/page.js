"use client";
import styles from './page.module.css';
import { Button, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { IoMdArrowRoundBack } from "react-icons/io";

export default function Verify() {
    const [email, setEmailAddress] = useState('example@gmail.com');
    const [countdown, setCountdown] = useState(60);
    const [isResendButtonDisabled, setIsResendButtonDisabled] = useState(true);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown((prevCountdown) => prevCountdown - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else {
            setIsResendButtonDisabled(false);
        }
    }, [countdown]);

    const handleResend = () => {
        resetCountdown()

        // Your resend email logic here
        sendOTPToEmail();
    };

    const resetCountdown = () => {
        setCountdown(60);
        setIsResendButtonDisabled(true);
    };

    const sendOTPToEmail = () => {
        console.log('Sending email...');
    };

    return (
        <div className={styles.content}>
            <div className={styles.container}>
                <h1>Check your email</h1>

                <p className={styles.subtitle}>
                    Please enter the six digit verification code we sent
                    to <span className={styles.emailHighlight}>{email}</span>.
                </p>

                <TextField
                    id="verification-code"
                    label="6 Digits Verification Code"
                    variant="filled"
                    className={styles.textfield}
                />

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    className={styles.confirmButton}
                >
                    Confirm
                </Button>

                <div className={styles.resentConatiner}>
                    <label>Didn&apos;t get an email? </label>
                    {isResendButtonDisabled ?
                        <label>Resent in 00:{countdown}.</label> :
                        <label className={styles.resentButton} onClick={handleResend}>Resent</label>
                    }
                </div>

                <Button
                    type="submit"
                    variant="text"
                    color="primary"
                    className={styles.logoutButton}
                >
                    <IoMdArrowRoundBack className={styles.arrowIcon} />
                    Logout
                </Button>
            </div>
        </div>
    )
};
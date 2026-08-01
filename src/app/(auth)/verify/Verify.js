'use client';
import styles from './page.module.css';
import { Alert, Button, Dialog, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IoMdArrowRoundBack } from 'react-icons/io';
import Cookies from 'js-cookie';
import apiClient from '@/utility/api';
import { VscVerified } from 'react-icons/vsc';
import withAuthorization from '@/hoc/withAuthorization';
import { EMAIL_VERIFICATION, RESEND_VERIFICATION_CODE } from '@/utility/apiPaths';

const Verify = () => {
    const router = useRouter();

    const [email, setEmailAddress] = useState('');
    const [otp, setOtp] = useState('');
    const [countdown, setCountdown] = useState(60);
    const [isResendButtonDisabled, setIsResendButtonDisabled] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isSubmissionButtonLoading, setIsSubmissionButtonLoading] = useState(false);
    const [isVerifiedConfirmed, setVerifiedConfirmed] = useState(false);

    useEffect(() => {
        const getCookiesInfo = () => {
            const authStatusCookie = Cookies.get('authStatus');
            console.log("authStatusCookie 1", authStatusCookie);

            if (authStatusCookie) {
                try {
                    console.log("authStatusCookie 2", authStatusCookie);
                    const authStatus = JSON.parse(authStatusCookie);
                    const email = authStatus.data.email;
                    setEmailAddress(email);
                } catch (error) {
                    // TODO: Handle Error.
                    console.log("error 1", error);
                    console.error('Error parsing authStatus cookie:', error);
                }
            } else {
                console.log("authStatusCookie not found");
                // router.replace('/login');
            }
        };

        getCookiesInfo();
    }, [router])

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
        sendOTPToEmail();
    };

    const resetCountdown = () => {
        setCountdown(60);
        setIsResendButtonDisabled(true);
    };

    const sendOTPToEmail = async (e) => {
        setSuccessMessage(null);
        setErrorMessage(null);

        const payload = {
            username: email
        };

        try {
            await apiClient.post(`${RESEND_VERIFICATION_CODE}`, payload);
            setSuccessMessage('A 6-digit OTP has been resent to you.')
            resetCountdown()
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            setErrorMessage(`${message} (Error code: ${code})`);
        }
    };

    const handleInputChange = (event) => {
        setOtp(event.target.value);
    };

    const confirmHandler = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        setIsSubmissionButtonLoading(true);

        const payload = {
            username: email,
            confirmationCode: otp
        };

        try {
            await apiClient.post(`${EMAIL_VERIFICATION}`, payload);
            // Remove cookie with same options as when it was set
            const isProduction = process.env.NODE_ENV === 'production';
            Cookies.remove('authStatus', {
                path: '/',
                domain: isProduction ? '.homefood.sg' : undefined,
            });
            setVerifiedConfirmed(true);
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            setErrorMessage(`${message} (Error code: ${code})`);
        }

        setIsSubmissionButtonLoading(false);
    };

    const logoutHandler = (e) => {
        e.preventDefault();

        // Remove cookie with same options as when it was set
        const isProduction = process.env.NODE_ENV === 'production';
        Cookies.remove('authStatus', {
            path: '/',
            domain: isProduction ? '.homefood.sg' : undefined,
        });
        router.replace('/login');
    };

    const loginNowHandler = (e) => {
        e.preventDefault();
        router.replace('/login');
    };

    return (
        <>
            <Dialog open={isVerifiedConfirmed}>
                <div className={styles.dialogContainer}>
                    <VscVerified
                        className={styles.confirmLogo}
                    />
                    <h2>Email verified!</h2>
                    <p>From now on, you are part of us! <strong>Login now</strong> and start building your loyalty program for you business.</p>
                    
                    <Button
                        type='submit'
                        variant='contained'
                        color='primary'
                        fullWidth
                        onClick={loginNowHandler}
                        className={styles.loginNowButton}
                    >
                        Login Now!
                    </Button>
                </div>
            </Dialog>
            <div className={styles.content}>
                <div className={styles.container}>
                    <h1>Check your email</h1>

                    <p className={styles.subtitle}>
                        Please enter the six digit verification code we sent
                        to <span className={styles.emailHighlight}>{email}</span>.
                    </p>

                    {errorMessage && <Alert severity='error'>{errorMessage}</Alert>}
                    {successMessage && <Alert severity='success'>{successMessage}</Alert>}

                    <form className={styles.submissionForm} onSubmit={confirmHandler}>
                        <TextField
                            id='verification-code'
                            label='6 Digits Verification Code'
                            variant='filled'
                            onChange={handleInputChange}
                            className={styles.textfield}
                        />

                        <Button
                            type='submit'
                            variant='contained'
                            color='primary'
                            fullWidth
                            loading={isSubmissionButtonLoading}
                            // onClick={confirmHandler}
                            className={styles.confirmButton}
                        >
                            Confirm
                        </Button>
                    </form>

                    <div className={styles.resentConatiner}>
                        <label>Didn&apos;t get an email? </label>
                        {isResendButtonDisabled ?
                            <label>Resent in 00:{countdown}.</label> :
                            <label className={styles.resentButton} onClick={handleResend}>Resent</label>
                        }
                    </div>

                    <Button
                        variant='text'
                        color='primary'
                        onClick={logoutHandler}
                        className={styles.logoutButton}
                    >
                        <IoMdArrowRoundBack className={styles.arrowIcon} />
                        Logout
                    </Button>
                </div>
            </div>
        </>
    )
};

export default withAuthorization(Verify);
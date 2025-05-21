'use client';
import Image from 'next/image';
import styles from './page.module.css';
import { FaLevelDownAlt } from 'react-icons/fa';
import Link from 'next/link';
import { Alert, Button, Dialog, TextField } from '@mui/material';
import { useState } from 'react';
import { IoMdArrowRoundBack } from 'react-icons/io';
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';
import { VscVerified } from 'react-icons/vsc';
import withAuthorization from '@/hoc/withAuthorization';
import { CONFIRM_FORGOT_PASSWORD, FORGOT_PASSWORD } from '@/utility/apiPaths';

const ForgotPassword = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isAtRestPasswordStage, setIsAtRestPasswordStage] = useState(false)
    const [isSubmissionButtonLoading, setIsSubmissionButtonLoading] = useState(false);
    const [isResetSuccessfully, setIsResetSuccessfully] = useState(false);

    const handleForgetPasswordClick = async (e) => {
        e.preventDefault();

        if (!isAtRestPasswordStage) {
            sendVerificationCode()
        } else {
            resetPassword()
        };

    };

    const sendVerificationCode = async () => {
        setErrorMessage(null)
        setIsSubmissionButtonLoading(true);

        if (!isSendOTPFormVerified) {
            setIsSubmissionButtonLoading(false);
            return;
        };

        const payload = {
            'username': email
        };

        try {
            await apiClient.post(`${FORGOT_PASSWORD}`, payload);
            setIsAtRestPasswordStage(true);
            setSuccessMessage('An OTP values had been sent to your email. Enter your new password and OTP to reset.')
        } catch (error) {
            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error.code;
            setIsSubmissionButtonLoading(false);
            setErrorMessage(`${message} (Error code: ${code})`);
        }

        setIsSubmissionButtonLoading(false);
    };

    const isSendOTPFormVerified = () => {
        const errorCode = '202'

        if (!email || email.trim() === '') {
            setErrorMessage(`Email cannot be empty. (Error code: ${errorCode})`);
            return false
        }
    };

    const resetPassword = async () => {
        setErrorMessage(null)
        setIsSubmissionButtonLoading(true);

        if (!isResetFOrmVerified()) {
            setIsSubmissionButtonLoading(false);
            return;
        }

        const payload = {
            'username': email,
            'newPassword': password,
            'confirmationCode': verificationCode
        };

        try {
            await apiClient.post(`${CONFIRM_FORGOT_PASSWORD}`, payload)
            setIsSubmissionButtonLoading(false);
            setIsResetSuccessfully(true)
        } catch (error) {
            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error.code;
            setIsSubmissionButtonLoading(false);
            setErrorMessage(`${message} (Error code: ${code})`);
        }
    };

    const isResetFOrmVerified = () => {
        const errorCode = '203';

        if (!email || email.trim() === '') {
            setErrorMessage(`Email cannot be empty. (Error code: ${errorCode})`);
            return false
        }

        if (!password || password.trim() === '') {
            setErrorMessage(`Password cannot be empty. (Error code: ${errorCode})`);
            return false
        }

        if (!confirmPassword || confirmPassword.trim() === '') {
            setErrorMessage(`Confirm password cannot be empty. (Error code: ${errorCode})`);
            return false
        }

        if (!verificationCode || verificationCode.trim() === '') {
            setErrorMessage(`Verification code cannot be empty. (Error code: ${errorCode})`);
            return false
        }

        if (password !== confirmPassword) {
            setErrorMessage(`Password and confirm password should be the same. (Error code: ${errorCode})`);
            return false
        }

        return true
    }

    const loginNowHandler = (e) => {
        e.preventDefault();
        router.replace('/login');
    };

    return (
        <main className={styles.main}>
            <Dialog open={isResetSuccessfully}>
                <div className={styles.dialogContainer}>
                    <VscVerified
                        className={styles.confirmLogo}
                    />
                    <h2>Password Reset!</h2>
                    <p>You can now login with the new password you had set.</p>

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

            {/* [LEFT] First Section: Introduction */}
            <section className={styles.introSection}>
                <div>
                    <p className={styles.tagline}>
                        Boost Sales with a Powerful Loyalty System – Manage, Engage, and Grow Your Business in One Platform.
                    </p>
                </div>

                <div>
                    <div className={styles.subTagLineContainer}>
                        <p className={styles.subTagLine}>Trusted by leading brands</p>
                        <FaLevelDownAlt className={styles.faLevelDown} />
                    </div>

                    <div className={styles.brands}>
                        <Image
                            src='/images/auth/brands/generation-coffee.png'
                            width='80'
                            height='80'
                            alt=''
                        />
                        <Image
                            src='/images/auth/brands/keens-bagelry.png'
                            width='80'
                            height='80'
                            alt=''
                        />
                    </div>

                </div>
            </section>

            {/* [RIGHT] Second Section: Sign-up Form */}
            <section className={styles.rightSection}>
                <div className={styles.formSection}>
                    <div className={styles.formTitlesSection}>
                        <h2>Collbine For Business</h2>
                        <h1>Reset Password</h1>
                        <p>No worries, we&apos;ll send you OTP code to verify and reset your password.</p>
                    </div>

                    <form onSubmit={handleForgetPasswordClick} className={styles.form}>
                        {successMessage && <Alert severity='success'>{successMessage}</Alert>}
                        {errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

                        <TextField
                            disabled={isAtRestPasswordStage}
                            variant='standard'
                            label='Email'
                            type='email'
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        {isAtRestPasswordStage && <TextField
                            variant='standard'
                            label='Password'
                            type='password'
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />}

                        {isAtRestPasswordStage && <TextField
                            variant='standard'
                            label='Confirm Password'
                            type='password'
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />}

                        {isAtRestPasswordStage && <TextField
                            variant='standard'
                            label='Verification Code'
                            type='number'
                            fullWidth
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            required
                        />}

                        <Button
                            type='submit'
                            variant='contained'
                            color='primary'
                            fullWidth
                            loading={isSubmissionButtonLoading}
                            className={styles.resetPwdButton}
                        >
                            {isAtRestPasswordStage ? 'Reset Password' : 'Email me'}
                        </Button>
                    </form>



                    <Link
                        href='/login'
                        className={styles.backToLogin}
                    >
                        <IoMdArrowRoundBack />
                        Back to Login
                    </Link>

                </div>
            </section>
        </main>
    )
};

export default withAuthorization(ForgotPassword);
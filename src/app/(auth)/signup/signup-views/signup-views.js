'use client';
import Image from 'next/image';
import styles from './signup-views.module.css';
import { FaLevelDownAlt } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import Link from 'next/link';
import { Alert, Button, TextField } from '@mui/material';
import { useState } from 'react';
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';
import withAuthorization from '@/hoc/withAuthorization';
import { SIGN_UP } from '@/utility/apiPaths';
import Cookies from 'js-cookie';

const SignupViews = () => {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [isSubmissionButtonLoading, setIsSubmissionButtonLoading] = useState(false);

    const isFormVerified = () => {
        // Regex to validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errorCode = '201'
        // Clear previous error messages
        setErrorMessage(null);

        // Check for empty fields
        if (!email) {
            setErrorMessage(`Email cannot be empty. (Error code: ${errorCode})`);
            return false;
        }
        if (!password) {
            setErrorMessage(`Password cannot be empty. (Error code: ${errorCode})`);
            return false;
        }
        if (!confirmPassword) {
            setErrorMessage(`Please confirm your password. (Error code: ${errorCode})`);
            return false;
        }

        // Validate email format
        if (!emailRegex.test(email)) {
            setErrorMessage(`Please enter a valid email address. (Error code: ${errorCode})`);
            return false;
        }

        // Validate password length
        if (password.length < 8) {
            setErrorMessage(`Password must be at least 8 characters long. (Error code: ${errorCode})`);
            return false;
        }

        // Validate confirm password matches password
        if (password !== confirmPassword) {
            setErrorMessage(`Passwords do not match. (Error code: ${errorCode})`);
            return false;
        }

        // If all validations pass
        setErrorMessage(null);
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmissionButtonLoading(true);

        if (!isFormVerified()) {
            setIsSubmissionButtonLoading(false);
            return;
        };

        const payload = {
            username: email,
            email,
            password
        };

        try {
            await apiClient.post(`${SIGN_UP}`, payload);
            console.log("verify to can called");

            const authStatusCookie = Cookies.get('authStatus');

            if (!authStatusCookie) {
                console.log("Signup fallback: setting authStatus cookie manually");

                const authStatus = {
                    status: 'awaiting_verification',
                    data: {
                        email: email,
                        result: email,
                    },
                };

                const isProduction = process.env.NODE_ENV === 'production';
                Cookies.set('authStatus', JSON.stringify(authStatus), {
                    expires: 1,
                    path: '/',
                    secure: isProduction,
                    sameSite: 'Lax',
                    domain: isProduction ? '.homefood.sg' : undefined,
                });
            }

            router.push('/verify')
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            setIsSubmissionButtonLoading(false);
            setErrorMessage(`${message} (Error code: ${code})`);
        }
    };

    const handleGoogleSignUp = () => {
        // Add your Google sign-up logic here
    };

    return (
        <main className={styles.main}>
            {/* [LEFT] First Section: Introduction */}
            <section className={styles.introSection}>
                <div className={styles.titleDiv}>
                    <p className={styles.tagline}>
                        Manage your loyalty program, track customer engagement, and grow your business - all in one place.
                    </p>
                </div>

                {/* <div>
                    <div className={styles.subTagLineContainer}>
                        <FaLevelDownAlt className={styles.faLevelDownLeft} />
                        <p className={styles.subTagLine}>Trusted by leading brands</p>
                        <FaLevelDownAlt className={styles.faLevelDown} />
                    </div>

                    <div className={styles.brands}>
                        <Image
                            src='/images/auth/brands/generation-coffee.png'
                            width='80'
                            height='80'
                            alt=''
                            priority
                        />
                        <Image
                            src='/images/auth/brands/keens-bagelry.png'
                            width='80'
                            height='80'
                            alt=''
                            priority
                        />
                    </div>

                </div> */}
            </section>

            {/* [RIGHT] Second Section: Sign-up Form */}
            <section className={styles.rightSection}>
                <div className={styles.formSection}>
                    <div className={styles.formTitlesSection}>
                        <h2>HomeFood For Business</h2>
                        <h1>Create an account</h1>
                        <p>Welcome. Please enter your details.</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {errorMessage && <Alert severity='error'>{errorMessage}</Alert>}
                        <TextField
                            variant='standard'
                            label='Email'
                            type='email'
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <TextField
                            variant='standard'
                            label='Password'
                            type='password'
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <TextField
                            variant='standard'
                            label='Confirm Password'
                            type='password'
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <Button
                            type='submit'
                            variant='contained'
                            fullWidth
                            loading={isSubmissionButtonLoading}
                            className={styles.createButton}
                        >
                            Sign up
                        </Button>
                    </form>


                    {/* <div className={styles.orContainer}>
                        <span className={styles.lineText}>or</span>
                        <hr className={styles.line} />
                    </div>

                    <Button
                        variant='contained'
                        startIcon={<FcGoogle />} // Using the Google icon from react-icons
                        onClick={handleGoogleSignUp}
                        fullWidth
                        className={styles.googleButton}
                    >
                        Sign Up with Google
                    </Button> */}

                    <div>
                        <p className={styles.haveAccountTag}>Have an account? <Link href='/login' className={styles.link}>Login</Link></p>
                    </div>
                </div>
            </section>
        </main>
    )
};

export default withAuthorization(SignupViews);
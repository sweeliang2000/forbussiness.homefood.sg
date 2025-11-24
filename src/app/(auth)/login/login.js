'use client';
import Image from 'next/image';
import styles from './page.module.css';
import { FaLevelDownAlt } from 'react-icons/fa';
import Link from 'next/link';
import { Alert, TextField, Button } from '@mui/material';
import { useState, Suspense, useEffect } from 'react';
import apiClient from '@/utility/api';
import { useRouter, useSearchParams } from 'next/navigation';
import withAuthorization from '@/hoc/withAuthorization';
import { SIGN_IN } from '@/utility/apiPaths';

const LoginContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');
    const urlMessage = searchParams.get('message');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [isSubmissionButtonLoading, setIsSubmissionButtonLoading] = useState(false);

    // Show a friendly error if message=401 Unauthorized
    useEffect(() => {
        if (urlMessage && urlMessage.includes('401')) {
            setErrorMessage('You must be logged in to access this page. Please log in to continue.');
        }
    }, [urlMessage]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmissionButtonLoading(true);

        if (!isFormVerified()) {
            setIsSubmissionButtonLoading(false);
            return;
        }

        const payload = {
            'username': email,
            'password': password
        };

        try {
            const response = await apiClient.post(`${SIGN_IN}`, payload);
            const message = response.data.message
            console.log(response.data);
            
            if (message === 'Verification code resent successfully') {
                router.push('/verify')
                return;
            }

            if (redirectPath) {
                router.push(redirectPath);
            } else {
                router.push('/app'); // default redirect
            }
        } catch (error) {
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            setErrorMessage(`${message} (Error code: ${code})`);
            setIsSubmissionButtonLoading(false);
        }

    };

    const isFormVerified = () => {
        setErrorMessage('');

        if (!email.trim() || !password.trim()) {
            setErrorMessage('Both email and password are required.');
            return false;
        }

        return true
    };

    const handleGoogleLogin = () => {
        // Add your Google sign-up logic here
    };

    return (
        <main className={styles.main}>
            {/* [LEFT] First Section: Introduction */}
            <section className={styles.introSection}>
                <div className={styles.titleDiv}>
                    <p className={styles.tagline}>
                        Boost Sales with a Powerful Loyalty System – Manage, Engage, and Grow Your Business in One Platform.
                    </p>
                </div>

                <div>
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
                        <h1>Login</h1>
                        <p>Welcome. Please enter your details.</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        { errorMessage && <Alert severity='error' className={styles.alert}>{errorMessage}</Alert> }
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

                        <Link
                            href='/forgot-password'
                            className={styles.forgotPasswordBuuton}
                        >
                            Forget Password?
                        </Link>


                        <Button
                            type='submit'
                            variant='contained'
                            color='primary'
                            fullWidth
                            className={styles.loginButton}
                            loading={isSubmissionButtonLoading}
                        >
                            Login
                        </Button>
                    </form>


                    {/* <div className={styles.orContainer}>
                        <span className={styles.lineText}>or</span>
                        <hr className={styles.line} />
                    </div>

                    <Button
                        variant='contained'
                        startIcon={<FcGoogle />}
                        onClick={handleGoogleLogin}
                        fullWidth
                        className={styles.googleButton}
                    >
                        Login with Google
                    </Button> */}

                    <div>
                        <p className={styles.haveAccountTag}>Don&apos;t have an account yet? <Link href='/signup' className={styles.link}>Sign up</Link></p>
                    </div>
                </div>
            </section>
        </main>
    )
};

const Login = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
};

export default withAuthorization(Login);
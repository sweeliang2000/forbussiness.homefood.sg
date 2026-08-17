'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, TextField, Button } from '@mui/material';
import Cookies from 'js-cookie';

import apiClient from '@/utility/api';
import withAuthorization from '@/hoc/withAuthorization';
import { SIGN_IN } from '@/utility/apiPaths';
import { errorMessageFrom } from '@/utility/errorMessage';
import PasswordField from '@/components/PasswordField/PasswordField';
import AuthShell from '../_components/AuthShell';
import AuthCardSkeleton from '../_components/AuthCardSkeleton';
import styles from '../_components/authForm.module.css';

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

    const isFormVerified = () => {
        setErrorMessage('');

        if (!email.trim() || !password.trim()) {
            setErrorMessage('Both email and password are required.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmissionButtonLoading(true);

        if (!isFormVerified()) {
            setIsSubmissionButtonLoading(false);
            return;
        }

        const payload = { username: email, password };

        try {
            const response = await apiClient.post(`${SIGN_IN}`, payload);
            const message = response.data?.message;

            if (message === 'Verification code resent successfully') {
                // Fall back to setting authStatus client-side when the backend
                // cookie did not reach this domain.
                if (!Cookies.get('authStatus')) {
                    const isProduction = process.env.NODE_ENV === 'production';
                    Cookies.set(
                        'authStatus',
                        JSON.stringify({
                            status: 'awaiting_verification',
                            data: { email, result: email },
                        }),
                        {
                            expires: 1,
                            path: '/',
                            secure: isProduction,
                            sameSite: 'Lax',
                            // Host-only, matching the server's own authStatus cookie —
                            // otherwise the two scopes disagree and Verify's removal
                            // can't clear whichever one it didn't write.
                        }
                    );
                }

                setIsSubmissionButtonLoading(false);
                setTimeout(() => router.push('/verify'), 100);
                return;
            }

            router.push(redirectPath || '/app');
        } catch (error) {
            setErrorMessage(errorMessageFrom(error));
            setIsSubmissionButtonLoading(false);
        }
    };

    return (
        <AuthShell
            title="Log in"
            subtitle="Welcome back. Enter your details to continue."
            footer={
                <p>
                    Don&apos;t have an account yet? <Link href="/signup">Sign up</Link>
                </p>
            }
        >
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
                {errorMessage ? (
                    // aria-live so the failure is announced, not just repainted.
                    <Alert severity="error" className={styles.alert} role="alert" aria-live="polite">
                        {errorMessage}
                    </Alert>
                ) : null}

                <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                />

                <PasswordField
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />

                <Link href="/forgot-password" className={styles.subtleLink}>
                    Forgot password?
                </Link>

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    loading={isSubmissionButtonLoading}
                >
                    Log in
                </Button>
            </form>
        </AuthShell>
    );
};

const Login = () => (
    // A card-shaped skeleton rather than an unstyled "Loading..." string, which
    // flashed as raw text in the top-left corner before hydration.
    <Suspense fallback={<AuthCardSkeleton />}>
        <LoginContent />
    </Suspense>
);

export default withAuthorization(Login);

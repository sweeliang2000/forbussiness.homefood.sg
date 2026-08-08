'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, TextField } from '@mui/material';
import Cookies from 'js-cookie';

import apiClient from '@/utility/api';
import withAuthorization from '@/hoc/withAuthorization';
import { SIGN_UP } from '@/utility/apiPaths';
import { errorMessageFrom } from '@/utility/errorMessage';
import { checkPassword, PASSWORD_REQUIREMENTS_MESSAGE } from '@/utility/passwordPolicy';
import PasswordField from '@/components/PasswordField/PasswordField';
import AuthShell from '../../_components/AuthShell';
import PasswordRequirements from '../../_components/PasswordRequirements';
import styles from '../../_components/authForm.module.css';

const SignupViews = () => {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [isSubmissionButtonLoading, setIsSubmissionButtonLoading] = useState(false);

    const isFormVerified = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errorCode = '201';
        setErrorMessage(null);

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
        if (!emailRegex.test(email)) {
            setErrorMessage(`Please enter a valid email address. (Error code: ${errorCode})`);
            return false;
        }

        // Was a bare length >= 8 check, while the server separately required
        // four character classes and only said so after submitting. Both sides
        // now read the same policy.
        if (!checkPassword(password).valid) {
            setErrorMessage(`${PASSWORD_REQUIREMENTS_MESSAGE} (Error code: ${errorCode})`);
            return false;
        }

        if (password !== confirmPassword) {
            setErrorMessage(`Passwords do not match. (Error code: ${errorCode})`);
            return false;
        }

        setErrorMessage(null);
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmissionButtonLoading(true);

        if (!isFormVerified()) {
            setIsSubmissionButtonLoading(false);
            return;
        }

        try {
            await apiClient.post(`${SIGN_UP}`, { username: email, email, password });

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
                        domain: isProduction ? '.homefood.sg' : undefined,
                    }
                );
            }

            router.push('/verify');
        } catch (error) {
            setIsSubmissionButtonLoading(false);
            setErrorMessage(errorMessageFrom(error));
        }
    };

    const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

    return (
        <AuthShell
            title="Create an account"
            subtitle="Start taking orders from your kitchen."
            footer={
                <p>
                    Have an account? <Link href="/login">Log in</Link>
                </p>
            }
        >
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
                {errorMessage ? (
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
                    autoComplete="new-password"
                    aria-describedby="signup-password-rules"
                    required
                />

                <PasswordRequirements value={password} id="signup-password-rules" />

                <PasswordField
                    label="Confirm password"
                    fullWidth
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    // Told as soon as it is knowable, rather than on submit.
                    error={mismatch}
                    helperText={mismatch ? 'Passwords do not match' : ''}
                    required
                />

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    loading={isSubmissionButtonLoading}
                >
                    Sign up
                </Button>
            </form>
        </AuthShell>
    );
};

export default withAuthorization(SignupViews);

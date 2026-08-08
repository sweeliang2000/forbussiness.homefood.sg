'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, TextField } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

import apiClient from '@/utility/api';
import withAuthorization from '@/hoc/withAuthorization';
import { CONFIRM_FORGOT_PASSWORD, FORGOT_PASSWORD } from '@/utility/apiPaths';
import { errorMessageFrom } from '@/utility/errorMessage';
import { checkPassword, PASSWORD_REQUIREMENTS_MESSAGE } from '@/utility/passwordPolicy';
import PasswordField from '@/components/PasswordField/PasswordField';
import AuthShell from '../_components/AuthShell';
import AuthSuccessDialog from '../_components/AuthSuccessDialog';
import PasswordRequirements from '../_components/PasswordRequirements';
import styles from '../_components/authForm.module.css';

/**
 * Two stages on one route, unchanged: request a 6-digit code by email, then
 * enter it with a new password. Cognito only ever sends a code, and a
 * link-based reset was deliberately ruled out.
 */
const ForgotPassword = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isAtResetPasswordStage, setIsAtResetPasswordStage] = useState(false);
    const [isSubmissionButtonLoading, setIsSubmissionButtonLoading] = useState(false);
    const [isResetSuccessfully, setIsResetSuccessfully] = useState(false);

    const isSendOTPFormVerified = () => {
        const errorCode = '202';

        if (!email || email.trim() === '') {
            setErrorMessage(`Email cannot be empty. (Error code: ${errorCode})`);
            return false;
        }

        // Previously fell off the end returning undefined, so even a correct
        // call site would have treated a valid email as a failure.
        return true;
    };

    const sendVerificationCode = async () => {
        setErrorMessage(null);
        setIsSubmissionButtonLoading(true);

        // Was `if (!isSendOTPFormVerified)` — a reference to the function, which
        // is always truthy, so this guard never ran and an empty email was sent
        // to the server.
        if (!isSendOTPFormVerified()) {
            setIsSubmissionButtonLoading(false);
            return;
        }

        try {
            await apiClient.post(`${FORGOT_PASSWORD}`, { username: email });
            setIsAtResetPasswordStage(true);
            setSuccessMessage(
                'We sent a 6-digit code to your email. Enter it below with your new password.'
            );
        } catch (error) {
            setErrorMessage(errorMessageFrom(error));
        }

        setIsSubmissionButtonLoading(false);
    };

    const isResetFormVerified = () => {
        const errorCode = '203';

        if (!email || email.trim() === '') {
            setErrorMessage(`Email cannot be empty. (Error code: ${errorCode})`);
            return false;
        }
        if (!verificationCode || verificationCode.trim() === '') {
            setErrorMessage(`Verification code cannot be empty. (Error code: ${errorCode})`);
            return false;
        }
        if (!password || password.trim() === '') {
            setErrorMessage(`Password cannot be empty. (Error code: ${errorCode})`);
            return false;
        }

        // The server's confirmForgotPassword does not check strength at all —
        // the policy regex lives in signUp only — so without this a reset could
        // set a password that signup would have rejected.
        if (!checkPassword(password).valid) {
            setErrorMessage(`${PASSWORD_REQUIREMENTS_MESSAGE} (Error code: ${errorCode})`);
            return false;
        }

        if (password !== confirmPassword) {
            setErrorMessage(`Password and confirm password should be the same. (Error code: ${errorCode})`);
            return false;
        }

        return true;
    };

    const resetPassword = async () => {
        setErrorMessage(null);
        setIsSubmissionButtonLoading(true);

        if (!isResetFormVerified()) {
            setIsSubmissionButtonLoading(false);
            return;
        }

        try {
            await apiClient.post(`${CONFIRM_FORGOT_PASSWORD}`, {
                username: email,
                newPassword: password,
                confirmationCode: verificationCode,
            });
            setIsSubmissionButtonLoading(false);
            setIsResetSuccessfully(true);
        } catch (error) {
            setIsSubmissionButtonLoading(false);
            setErrorMessage(errorMessageFrom(error));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isAtResetPasswordStage) resetPassword();
        else sendVerificationCode();
    };

    const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

    return (
        <>
            <AuthSuccessDialog
                open={isResetSuccessfully}
                title="Password reset"
                message="You can now log in with your new password."
                actionLabel="Log in"
                onAction={() => router.replace('/login')}
            />

            <AuthShell
                title="Reset password"
                subtitle={
                    isAtResetPasswordStage
                        ? 'Enter the code we emailed you, along with a new password.'
                        : "No worries. We'll email you a code to verify it's you."
                }
                footer={
                    <Link href="/login" className={styles.backLink}>
                        <ArrowBackRoundedIcon fontSize="small" aria-hidden="true" />
                        Back to log in
                    </Link>
                }
            >
                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                    {successMessage ? (
                        <Alert severity="success" className={styles.alert} aria-live="polite">
                            {successMessage}
                        </Alert>
                    ) : null}
                    {errorMessage ? (
                        <Alert severity="error" className={styles.alert} role="alert" aria-live="polite">
                            {errorMessage}
                        </Alert>
                    ) : null}

                    <TextField
                        disabled={isAtResetPasswordStage}
                        label="Email"
                        type="email"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        autoFocus
                        required
                    />

                    {isAtResetPasswordStage ? (
                        <>
                            <TextField
                                label="Verification code"
                                // Was type="number", which gives spinners and
                                // changes value on scroll. A code is a string of
                                // digits, not a quantity.
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                fullWidth
                                value={verificationCode}
                                onChange={(e) =>
                                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                                }
                                required
                            />

                            <PasswordField
                                label="New password"
                                fullWidth
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                aria-describedby="reset-password-rules"
                                required
                            />

                            <PasswordRequirements value={password} id="reset-password-rules" />

                            <PasswordField
                                label="Confirm new password"
                                fullWidth
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                error={mismatch}
                                helperText={mismatch ? 'Passwords do not match' : ''}
                                required
                            />
                        </>
                    ) : null}

                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        size="large"
                        loading={isSubmissionButtonLoading}
                    >
                        {isAtResetPasswordStage ? 'Reset password' : 'Email me a code'}
                    </Button>
                </form>
            </AuthShell>
        </>
    );
};

export default withAuthorization(ForgotPassword);

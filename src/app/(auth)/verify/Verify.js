'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, TextField } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Cookies from 'js-cookie';

import apiClient from '@/utility/api';
import withAuthorization from '@/hoc/withAuthorization';
import { EMAIL_VERIFICATION, RESEND_VERIFICATION_CODE } from '@/utility/apiPaths';
import { errorMessageFrom } from '@/utility/errorMessage';
import AuthShell from '../_components/AuthShell';
import AuthCardSkeleton from '../_components/AuthCardSkeleton';
import AuthSuccessDialog from '../_components/AuthSuccessDialog';
import styles from '../_components/authForm.module.css';

const RESEND_SECONDS = 60;

const VerifyContent = () => {
    const router = useRouter();
    // Signup pushes `?from=signup`; login's resend branch pushes a bare
    // /verify. The escape hatch below has to point back at whichever form the
    // email was typed into, because a typo in that email is the main reason
    // anyone leaves this page.
    const searchParams = useSearchParams();
    const cameFromSignup = searchParams.get('from') === 'signup';
    const exitPath = cameFromSignup ? '/signup' : '/login';

    const [email, setEmailAddress] = useState('');
    const [otp, setOtp] = useState('');
    const [countdown, setCountdown] = useState(RESEND_SECONDS);
    const [isResendButtonDisabled, setIsResendButtonDisabled] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isSubmissionButtonLoading, setIsSubmissionButtonLoading] = useState(false);
    const [isVerifiedConfirmed, setVerifiedConfirmed] = useState(false);

    useEffect(() => {
        const authStatusCookie = Cookies.get('authStatus');
        if (!authStatusCookie) return;

        try {
            const authStatus = JSON.parse(authStatusCookie);
            setEmailAddress(authStatus.data.email);
        } catch (error) {
            console.error('Error parsing authStatus cookie:', error);
        }
    }, [router]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
            return () => clearInterval(timer);
        }
        setIsResendButtonDisabled(false);
    }, [countdown]);

    // A cookie's identity is (name, domain, path), so a removal only lands if its
    // domain matches how the cookie was set. The server sets authStatus host-only
    // (getCookieOptions never sets a domain), so the old `.homefood.sg` removal
    // expired a cookie that never existed and left the real one in place — after
    // which AuthGuard read `awaiting_verification` and bounced /login back to
    // /verify forever. Host-only first; the domain-scoped pass only exists to
    // clear copies left in browsers by the builds that set it that way.
    const clearAuthStatusCookie = () => {
        Cookies.remove('authStatus', { path: '/' });
        Cookies.remove('authStatus', { path: '/', domain: '.homefood.sg' });
    };

    const sendOTPToEmail = async () => {
        setSuccessMessage(null);
        setErrorMessage(null);

        try {
            await apiClient.post(`${RESEND_VERIFICATION_CODE}`, { username: email });
            setSuccessMessage('A new 6-digit code is on its way.');
            setCountdown(RESEND_SECONDS);
            setIsResendButtonDisabled(true);
        } catch (error) {
            setErrorMessage(errorMessageFrom(error));
        }
    };

    const confirmHandler = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        setIsSubmissionButtonLoading(true);

        try {
            await apiClient.post(`${EMAIL_VERIFICATION}`, {
                username: email,
                confirmationCode: otp,
            });
            clearAuthStatusCookie();
            setVerifiedConfirmed(true);
        } catch (error) {
            setErrorMessage(errorMessageFrom(error));
        }

        setIsSubmissionButtonLoading(false);
    };

    // Clearing the cookie is not optional: AuthGuard bounces any path back to
    // /verify while authStatus is still `awaiting_verification`, so a plain
    // <Link> here would land straight back on this page.
    const exitHandler = () => {
        clearAuthStatusCookie();
        router.replace(exitPath);
    };

    // Zero-padded: the old template rendered "00:9" for the last nine seconds.
    const remaining = `0:${String(countdown).padStart(2, '0')}`;

    return (
        <>
            <AuthSuccessDialog
                open={isVerifiedConfirmed}
                title="Email verified"
                message="Your account is ready. Log in to set up your kitchen and start taking orders."
                actionLabel="Log in"
                onAction={() => router.replace('/login')}
            />

            <AuthShell
                title="Check your email"
                subtitle={
                    email
                        ? `Enter the six-digit code we sent to ${email}.`
                        : 'Enter the six-digit code we sent to your email.'
                }
                footer={
                    <Button variant="text" color="primary" onClick={exitHandler} size="small">
                        <ArrowBackRoundedIcon fontSize="small" aria-hidden="true" />
                        &nbsp;{cameFromSignup ? 'Back to sign up' : 'Back to log in'}
                    </Button>
                }
            >
                <form className={styles.form} onSubmit={confirmHandler} noValidate>
                    {errorMessage ? (
                        <Alert severity="error" className={styles.alert} role="alert" aria-live="polite">
                            {errorMessage}
                        </Alert>
                    ) : null}
                    {successMessage ? (
                        <Alert severity="success" className={styles.alert} aria-live="polite">
                            {successMessage}
                        </Alert>
                    ) : null}

                    <TextField
                        id="verification-code"
                        label="6-digit code"
                        fullWidth
                        // Was uncontrolled — no `value` binding at all — so the
                        // field and React state could drift apart.
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        // Lets iOS and Android offer the code straight from the
                        // notification instead of making people switch apps.
                        autoComplete="one-time-code"
                        autoFocus
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
                        Confirm
                    </Button>

                    <p className={styles.secondaryAction}>
                        Didn&apos;t get an email?{' '}
                        {isResendButtonDisabled ? (
                            // aria-live so the countdown reaching zero is
                            // announced, not just repainted.
                            <span aria-live="polite">Resend in {remaining}</span>
                        ) : (
                            // Was a bare <label onClick>, which no keyboard user
                            // could reach.
                            <Button variant="text" size="small" onClick={sendOTPToEmail}>
                                Resend code
                            </Button>
                        )}
                    </p>
                </form>
            </AuthShell>
        </>
    );
};

const Verify = () => (
    // useSearchParams needs a boundary above it, same as the login page.
    <Suspense fallback={<AuthCardSkeleton />}>
        <VerifyContent />
    </Suspense>
);

export default withAuthorization(Verify);

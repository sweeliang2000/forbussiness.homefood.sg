'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import { LuMonitor, LuSmartphone } from 'react-icons/lu';
import apiClient from '@/utility/api';
import { USER_SIGN_IN_HISTORY, SIGN_OUT_TEAM_MEMBER } from '@/utility/apiPaths';
import AlertModal from '@/components/AlertModal/AlertModal';
import Shimmer from '@/components/Shimmer/Shimmer';
import styles from './MemberSessions.module.css';

const dateFormat = new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
});

const formatWhen = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? 'Unknown time' : dateFormat.format(date);
};

// Enough to tell a phone from a laptop, which is the question being asked
// here. Anything more precise wants a real UA parser.
const isMobile = (userAgent) => /iphone|ipad|android|mobile/i.test(userAgent || '');

const formatWhere = ({ city, region, country, ip }) => {
    const place = [city, region, country].filter(Boolean).join(', ');
    if (place && ip) return `${place} · ${ip}`;
    return place || ip || null;
};

const MemberSessions = ({ member, isOpen, onClose, onSignedOut, onError }) => {
    const [signIns, setSignIns] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const email = member?.email;

    useEffect(() => {
        if (!isOpen || !email) return undefined;

        let cancelled = false;
        setIsLoading(true);
        setSignIns([]);

        apiClient
            .get(`${USER_SIGN_IN_HISTORY}?email=${encodeURIComponent(email)}`)
            .then((response) => {
                if (!cancelled) setSignIns(response.data?.data?.signIns || []);
            })
            .catch((error) => {
                if (!cancelled && onError) onError(error);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, email, onError]);

    // Escape closes the sheet, and the page behind it holds still while open.
    useEffect(() => {
        if (!isOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, onClose]);

    const handleSignOut = useCallback(async () => {
        if (isSigningOut || !email) return;
        setIsSigningOut(true);
        try {
            await apiClient.post(SIGN_OUT_TEAM_MEMBER, { email });
            setConfirmOpen(false);
            onClose();
            if (onSignedOut) onSignedOut(email);
        } catch (error) {
            setConfirmOpen(false);
            if (onError) onError(error);
        } finally {
            setIsSigningOut(false);
        }
    }, [email, isSigningOut, onClose, onSignedOut, onError]);

    return (
        <>
            <div
                className={`${styles.scrim} ${isOpen ? styles.open : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />

            <aside
                className={`${styles.sheet} ${isOpen ? styles.open : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={email ? `Sessions for ${email}` : 'Member sessions'}
            >
                <header className={styles.header}>
                    <div>
                        <p className={styles.title}>{email}</p>
                        <p className={styles.subtitle}>{member?.role || 'Operator'}</p>
                    </div>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <IoCloseSharp />
                    </button>
                </header>

                <div className={styles.body}>
                    <p className={styles.sectionLabel}>Recent sign-ins</p>

                    {isLoading ? (
                        [0, 1, 2].map((i) => (
                            <div key={i} className={styles.skeleton}>
                                <Shimmer width="150px" height="14px" responsive={false} />
                                <Shimmer width={`${190 - i * 30}px`} height="12px" responsive={false} />
                            </div>
                        ))
                    ) : signIns.length === 0 ? (
                        <p className={styles.state}>
                            No sign-ins recorded yet. Sign-in history starts from the
                            first time someone logs in after this feature was added —
                            earlier sessions were never recorded.
                        </p>
                    ) : (
                        signIns.map((entry, index) => {
                            const where = formatWhere(entry);
                            const Icon = isMobile(entry.userAgent) ? LuSmartphone : LuMonitor;
                            return (
                                <div key={`${entry.at}-${index}`} className={styles.entry}>
                                    <Icon className={styles.entryIcon} aria-hidden="true" />
                                    <div className={styles.entryMain}>
                                        <div className={styles.entryWhen}>{formatWhen(entry.at)}</div>
                                        <div className={styles.entryWhere}>
                                            {where || (
                                                <span className={styles.unknown}>Location unavailable</span>
                                            )}
                                        </div>
                                        {entry.userAgent && (
                                            <div className={styles.entryDevice}>{entry.userAgent}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <footer className={styles.footer}>
                    <p className={styles.footerNote}>
                        Signing out ends every session on all their devices. Access tokens
                        already issued keep working until they expire, usually within an hour.
                    </p>
                    <Button
                        variant="outlined"
                        color="error"
                        className={styles.signOutButton}
                        onClick={() => setConfirmOpen(true)}
                        disabled={isSigningOut}
                    >
                        {isSigningOut ? 'Signing out…' : 'Sign out all sessions'}
                    </Button>
                </footer>
            </aside>

            <AlertModal
                open={confirmOpen}
                onClose={() => !isSigningOut && setConfirmOpen(false)}
                title="Sign out all sessions"
                description={
                    <div>
                        <p style={{ marginBottom: '10px' }}>
                            <strong>{email}</strong> will be signed out on every device and
                            will need to log in again.
                        </p>
                        <p>Their access and role are unchanged.</p>
                    </div>
                }
                onAction={handleSignOut}
                actionButtonText={isSigningOut ? 'Signing out…' : 'Sign out all sessions'}
                actionDisabled={isSigningOut}
                type="error"
                showActionButton={true}
            />
        </>
    );
};

export default MemberSessions;

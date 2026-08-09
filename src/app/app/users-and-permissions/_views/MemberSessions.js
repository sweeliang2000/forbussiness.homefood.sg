'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import { LuMonitor, LuSmartphone } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import apiClient from '@/utility/api';
import {
    USER_SESSIONS,
    REVOKE_SESSION,
    SIGN_OUT_TEAM_MEMBER,
    GLOBAL_SIGN_OUT
} from '@/utility/apiPaths';
import AlertModal from '@/components/AlertModal/AlertModal';
import Shimmer from '@/components/Shimmer/Shimmer';
import { describeDevice, describeLastSeen, isMobileDevice } from './MemberList';
import styles from './MemberSessions.module.css';

const formatWhere = ({ city, region, country, ip }) => {
    const place = [city, region, country].filter(Boolean).join(', ');
    if (place && ip) return `${place} · ${ip}`;
    return place || ip || null;
};

const MemberSessions = ({ member, isSelf = false, isOpen, onClose, onSignedOut, onError }) => {
    const router = useRouter();
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [revokingId, setRevokingId] = useState(null);
    const [confirmAllOpen, setConfirmAllOpen] = useState(false);
    const [isSigningOutAll, setIsSigningOutAll] = useState(false);

    const email = member?.email;

    const load = useCallback(async () => {
        if (!email) return;
        setIsLoading(true);
        try {
            const response = await apiClient.get(
                `${USER_SESSIONS}?email=${encodeURIComponent(email)}`
            );
            setSessions(response.data?.data?.sessions || []);
        } catch (error) {
            if (onError) onError(error);
        } finally {
            setIsLoading(false);
        }
    }, [email, onError]);

    useEffect(() => {
        if (!isOpen) return;
        setSessions([]);
        load();
    }, [isOpen, load]);

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

    const handleRevokeOne = useCallback(
        async (session) => {
            if (revokingId || !email) return;
            setRevokingId(session.id);
            try {
                await apiClient.post(REVOKE_SESSION, { email, sessionId: session.id });
                setSessions((current) => current.filter((s) => s.id !== session.id));
            } catch (error) {
                if (onError) onError(error);
            } finally {
                setRevokingId(null);
            }
        },
        [email, revokingId, onError]
    );

    const handleSignOutAll = useCallback(async () => {
        if (isSigningOutAll || !email) return;
        setIsSigningOutAll(true);
        try {
            if (isSelf) {
                // globalSignOut clears this request's cookies too, so the
                // browser isn't left holding a session it can't renew.
                await apiClient.post(GLOBAL_SIGN_OUT);
                router.replace('/login');
                return;
            }
            await apiClient.post(SIGN_OUT_TEAM_MEMBER, { email });
            setConfirmAllOpen(false);
            onClose();
            if (onSignedOut) onSignedOut(email);
        } catch (error) {
            setConfirmAllOpen(false);
            if (onError) onError(error);
        } finally {
            setIsSigningOutAll(false);
        }
    }, [email, isSelf, isSigningOutAll, router, onClose, onSignedOut, onError]);

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
                        <p className={styles.subtitle}>
                            {member?.role || 'Operator'}
                            {isSelf ? ' · You' : ''}
                        </p>
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
                    <p className={styles.sectionLabel}>Signed in on</p>

                    {isLoading ? (
                        [0, 1].map((i) => (
                            <div key={i} className={styles.skeleton}>
                                <Shimmer width="160px" height="14px" responsive={false} />
                                <Shimmer width={`${200 - i * 40}px`} height="12px" responsive={false} />
                            </div>
                        ))
                    ) : sessions.length === 0 ? (
                        <p className={styles.state}>
                            No active sessions. {isSelf ? 'You' : 'They'} will appear here
                            after signing in again.
                        </p>
                    ) : (
                        sessions.map((session) => {
                            const where = formatWhere(session);
                            const Icon = isMobileDevice(session.userAgent)
                                ? LuSmartphone
                                : LuMonitor;
                            return (
                                <div key={session.id} className={styles.entry}>
                                    <Icon className={styles.entryIcon} aria-hidden="true" />
                                    <div className={styles.entryMain}>
                                        <div className={styles.entryWhen}>
                                            {describeDevice(session.userAgent)}
                                            {session.isCurrent && (
                                                <span className={styles.currentTag}>
                                                    This device
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.entryWhere}>
                                            {where || (
                                                <span className={styles.unknown}>
                                                    Location unavailable
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.entryDevice}>
                                            {describeLastSeen(session.lastSeenAt)}
                                        </div>
                                    </div>
                                    {/* Signing out the device you're using is what the
                                        footer button is for, and it has to clear cookies
                                        as well — so it isn't offered per-row. */}
                                    {!session.isCurrent && (
                                        <button
                                            type="button"
                                            className={styles.revokeButton}
                                            onClick={() => handleRevokeOne(session)}
                                            disabled={revokingId === session.id}
                                        >
                                            {revokingId === session.id ? 'Signing out…' : 'Sign out'}
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <footer className={styles.footer}>
                    <p className={styles.footerNote}>
                        {isSelf
                            ? 'Signing out everywhere ends every session including this one — you’ll be returned to the login screen.'
                            : 'Signing out everywhere ends every session on all their devices.'}{' '}
                        A single device stops working within about a minute.
                    </p>
                    <Button
                        variant="outlined"
                        color="error"
                        className={styles.signOutButton}
                        onClick={() => setConfirmAllOpen(true)}
                        disabled={isSigningOutAll}
                    >
                        {isSigningOutAll ? 'Signing out…' : 'Sign out everywhere'}
                    </Button>
                </footer>
            </aside>

            <AlertModal
                open={confirmAllOpen}
                onClose={() => !isSigningOutAll && setConfirmAllOpen(false)}
                title="Sign out everywhere"
                description={
                    isSelf ? (
                        <div>
                            <p style={{ marginBottom: '10px' }}>
                                You&rsquo;ll be signed out on every device, <strong>including
                                this one</strong>, and returned to the login screen.
                            </p>
                            <p>Your account and role are unchanged.</p>
                        </div>
                    ) : (
                        <div>
                            <p style={{ marginBottom: '10px' }}>
                                <strong>{email}</strong> will be signed out on every device and
                                will need to log in again.
                            </p>
                            <p>Their access and role are unchanged.</p>
                        </div>
                    )
                }
                onAction={handleSignOutAll}
                actionButtonText={isSigningOutAll ? 'Signing out…' : 'Sign out everywhere'}
                actionDisabled={isSigningOutAll}
                type="error"
                showActionButton={true}
            />
        </>
    );
};

export default MemberSessions;

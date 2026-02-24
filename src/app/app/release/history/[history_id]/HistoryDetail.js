'use client';
import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { useState, useEffect } from 'react';
import apiClient from '@/utility/api';
import { RELEASED_HISTORY } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const HistoryDetailView = ({ historyId }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [errorStatus, setErrorStatus] = useState(null);
    const [releaseItem, setReleaseItem] = useState(null);

    useEffect(() => {
        const fetchAndSelectHistory = async () => {
            const index = parseInt(historyId, 10);
            if (Number.isNaN(index) || index < 0) {
                setError('Invalid release history');
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                setError(null);
                setErrorStatus(null);
                const response = await apiClient.get(RELEASED_HISTORY);

                if (!response.data.success || !response.data.data?.history) {
                    setError('Failed to load release history');
                    setIsLoading(false);
                    return;
                }

                const history = response.data.data.history;
                if (index >= history.length) {
                    setError('Release not found');
                    setErrorStatus(404);
                    setReleaseItem(null);
                } else {
                    setReleaseItem(history[index]);
                }
            } catch (err) {
                const errorData = err?.response?.data;
                const message = errorData?.message || errorData?.error?.message || err?.message || 'Failed to load release history';
                const statusCode = err?.response?.status;
                setError(message);
                setErrorStatus(statusCode ?? null);
                console.error('Error fetching release history:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (historyId != null) {
            fetchAndSelectHistory();
        } else {
            setError('Missing release identifier');
            setIsLoading(false);
        }
    }, [historyId]);

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const utcDateTime = dayjs.utc(dateString);
        const sgtDateTime = utcDateTime.tz('Asia/Singapore');
        return sgtDateTime.format('DD MMM YYYY, hh:mm A');
    };

    const parseRewardChances = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    if (isLoading) {
        return <LoadingPage />;
    }

    if (error && !releaseItem) {
        return <ErrorPage message={error} statusCode={errorStatus} />;
    }

    if (!releaseItem) {
        return <ErrorPage message="Release not found" statusCode={404} />;
    }

    const businessInfo = releaseItem.businessinformations?.[0] ?? null;
    const customerFacing = releaseItem.CustomerFacingDetails?.[0] ?? null;
    const qrConfig = releaseItem.qr_configuration?.[0] ?? null;
    const rewardChances = qrConfig?.rewardChances ? parseRewardChances(qrConfig.rewardChances) : [];

    return (
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <HeaderSection
                className={styles.header}
                title="Release History"
                description={
                    <p>
                        View the details of this release. <Link href="/app/release/history">Back to Release History</Link>
                    </p>
                }
                showButton={false}
            />

            <ContentCard className={styles.content}>
                <FieldHeader title="Release information" type="h3" />
                <div className={styles.informationCard}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Released at</span>
                        <span className={styles.infoValue}>{formatDateTime(releaseItem.datetime)}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Source</span>
                        <span className={styles.infoValue}>{releaseItem.source ?? 'N/A'}</span>
                    </div>
                </div>
            </ContentCard>

            {businessInfo && (
                <ContentCard className={styles.content}>
                    <FieldHeader title="Business information" type="h3" />
                    <div className={styles.informationCard}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Business name</span>
                            <span className={styles.infoValue}>{businessInfo.businessName ?? '—'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>UEN</span>
                            <span className={styles.infoValue}>{businessInfo.uen ?? '—'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Address</span>
                            <span className={styles.infoValue}>
                                {[businessInfo.addressUnitNumber, businessInfo.addressStreetAddress, businessInfo.addressBuildingName, businessInfo.addressPostalCode]
                                    .filter(Boolean)
                                    .join(', ') || '—'}
                            </span>
                        </div>
                    </div>
                </ContentCard>
            )}

            {customerFacing && (
                <ContentCard className={styles.content}>
                    <FieldHeader title="Customer facing details" type="h3" />
                    <div className={styles.informationCard}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Display name</span>
                            <span className={styles.infoValue}>{customerFacing.displayName ?? '—'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Description</span>
                            <span className={styles.infoValue}>{customerFacing.description ?? '—'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Category</span>
                            <span className={styles.infoValue}>{customerFacing.category ?? '—'}</span>
                        </div>
                        {customerFacing.locations?.length > 0 && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Locations</span>
                                <div className={styles.locationsList}>
                                    {customerFacing.locations.map((loc) => (
                                        <div key={loc.id || loc.locationName} className={styles.locationItem}>
                                            <strong>{loc.locationName}</strong> — {loc.address} {loc.postalCode ? `(${loc.postalCode})` : ''}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ContentCard>
            )}

            {qrConfig && (rewardChances.length > 0 || qrConfig.cardImage) && (
                <ContentCard className={styles.content}>
                    <FieldHeader title="QR configuration" type="h3" />
                    <div className={styles.informationCard}>
                        {qrConfig.cardImage && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Card image</span>
                                <div className={styles.imageWrap}>
                                    <img src={qrConfig.cardImage} alt="QR card" className={styles.cardImage} />
                                </div>
                            </div>
                        )}
                        {rewardChances.length > 0 && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Reward chances</span>
                                <ul className={styles.rewardList}>
                                    {rewardChances.map((chance, i) => {
                                        const name = chance.reward?.rewardName ?? chance.rewardId ?? `Reward ${i + 1}`;
                                        const pct = chance.percentage != null ? `${chance.percentage}%` : '';
                                        const max = chance.max != null ? ` (max: ${chance.max})` : '';
                                        return (
                                            <li key={i} className={styles.rewardItem}>
                                                {name} — {pct}{max}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Scan to Win enabled</span>
                            <span className={styles.infoValue}>{qrConfig.isEnabled === 'true' || qrConfig.isEnabled === true ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                </ContentCard>
            )}
        </form>
    );
};

export default HistoryDetailView;

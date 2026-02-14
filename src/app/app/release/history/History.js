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

const HistoryView = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [errorStatus, setErrorStatus] = useState(null);
    const [releaseHistory, setReleaseHistory] = useState([]);

    useEffect(() => {
        const fetchReleaseHistory = async () => {
            try {
                setIsLoading(true);
                setError(null);
                setErrorStatus(null);
                const response = await apiClient.get(RELEASED_HISTORY);
                
                if (response.data.success && response.data.data && response.data.data.history) {
                    setReleaseHistory(response.data.data.history);
                } else {
                    setError('Failed to load release history');
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

        fetchReleaseHistory();
    }, []);

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        // Parse UTC datetime and convert to Singapore time (Asia/Singapore)
        const utcDateTime = dayjs.utc(dateString);
        const sgtDateTime = utcDateTime.tz('Asia/Singapore');
        return sgtDateTime.format('DD MMM YYYY, hh:mm A');
    };

    if (isLoading) {
        return <LoadingPage />;
    }

    if (error) {
        return <ErrorPage message={error} statusCode={errorStatus} />;
    }

    return (
        <form
            className={styles.form}
            onSubmit={() => { }}
        >
            <HeaderSection
                className={styles.header}
                title='Release History'
                description={
                    <p>
                        View the status of your past submissions. <Link href='/'>Find out more.</Link>
                    </p>
                }
                showButton={false}
            />

            <ContentCard className={styles.content}>
                <div className={styles.historyHeader}>
                    <FieldHeader
                        title='Release History'
                        type='h3'
                    />
                </div>

                <div className={styles.historyList}>
                    {releaseHistory.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No release history available.</p>
                        </div>
                    ) : (
                        releaseHistory.map((release, index) => (
                            <Link 
                                key={release.datetime || index} 
                                href={`/app/release/history/${index}`}
                                className={styles.historyItem}
                            >
                                <div className={styles.historyItemContent}>
                                    <div className={styles.dateInfo}>
                                        <span className={styles.date}>{formatDateTime(release.datetime)}</span>
                                    </div>
                                </div>
                                <span className={styles.viewMore}>View More &gt;</span>
                            </Link>
                        ))
                    )}
                </div>
            </ContentCard>

        </form>
    )
};

export default HistoryView;
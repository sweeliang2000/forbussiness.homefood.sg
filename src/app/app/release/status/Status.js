'use client';
import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { useState, useEffect } from 'react';
import apiClient from '@/utility/api';
import { RELEASE_STATUS } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import dayjs from 'dayjs';

const StatusView = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [errorStatus, setErrorStatus] = useState(null);
    const [releaseData, setReleaseData] = useState(null);

    useEffect(() => {
        const fetchReleaseStatus = async () => {
            try {
                setIsLoading(true);
                setError(null);
                setErrorStatus(null);
                const response = await apiClient.get(RELEASE_STATUS);
                
                if (response.data.success && response.data.data) {
                    setReleaseData(response.data.data);
                } else {
                    setError('Failed to load release status');
                }
            } catch (err) {
                const errorData = err?.response?.data;
                const message = errorData?.message || errorData?.error?.message || err?.message || 'Failed to load release status';
                const statusCode = err?.response?.status;
                setError(message);
                setErrorStatus(statusCode ?? null);
                console.error('Error fetching release status:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReleaseStatus();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return dayjs(dateString).format('DD/MM/YYYY hh:mm A');
    };

    const getStatusDisplay = (status) => {
        if (!status) return 'N/A';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    if (isLoading) {
        return <LoadingPage />;
    }

    if (error) {
        return <ErrorPage message={error} statusCode={errorStatus} />;
    }

    if (!releaseData) {
        return <ErrorPage message="No release status data available" />;
    }

    return (
        <form
            className={styles.form}
            onSubmit={(e) => { e.preventDefault(); }}
        >
            <HeaderSection
                className={styles.header}
                title='Release Status'
                description={
                    <p>
                        View the status of your current submission. <Link href='/'>Find out more.</Link>
                    </p>
                }
                showButton={false}
            />

            <ContentCard className={styles.content}>
                <FieldHeader
                    title='Status and Date Information'
                    description='View the details of your release submission status.'
                />

                <div className={styles.informationCard}>
                    <div className={styles.statusInfo}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Submission Date:</span>
                            <span className={styles.infoValue}>{formatDate(releaseData.sentdatetime)}</span>
                        </div>
                        
                        {releaseData.rejected_at && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Rejected At:</span>
                                <span className={styles.infoValue}>{formatDate(releaseData.rejected_at)}</span>
                            </div>
                        )}
                        
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Status:</span>
                            <span className={`${styles.infoValue} ${styles.statusBadge} ${styles[releaseData.status] || ''}`}>
                                {getStatusDisplay(releaseData.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </ContentCard>

            {releaseData.reason && (
                <ContentCard className={styles.content}>
                    <FieldHeader
                        title='Reason'
                        description='Review the feedback provided for your submission.'
                    />

                    <div className={styles.reasonContent}>
                        <div 
                            className={styles.reasonText}
                            dangerouslySetInnerHTML={{ __html: releaseData.reason }}
                        />
                    </div>
                </ContentCard>
            )}
        </form>
    )
};

export default StatusView;
'use client';
import React from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import apiClient from '@/utility/api';
import { RELEASED_HISTORY } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const paginationModel = { page: 0, pageSize: 25 };
const defaultDataGridProps = {
    disableColumnFilter: true,
    disableColumnMenu: true,
    disableRowSelectionOnClick: true,
    disableSelectionOnClick: true,
    pageSizeOptions: [25, 50],
    getRowHeight: () => 'auto',
    style: { width: '100%', borderRadius: 12 },
    pagination: true,
};

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

    const parseCardStepDetails = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const getStampRewardFromSteps = (card) => {
        const steps = parseCardStepDetails(card.cardStepDetails);
        const withReward = steps.find((s) => s && s.reward);
        return withReward?.reward ?? null;
    };

    const formatOperatingHours = (hours) => {
        if (!hours || typeof hours !== 'object') return '';
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        return days
            .filter((d) => hours[d]?.isOpen)
            .map((d) => {
                const h = hours[d];
                return `${d.charAt(0).toUpperCase() + d.slice(1, 3)}: ${h.start || '—'} – ${h.end || '—'}`;
            })
            .join('; ') || '—';
    };

    const formatLocationsForDisplay = (locations) => {
        if (!Array.isArray(locations) || locations.length === 0) return '—';
        return locations
            .map((loc) => {
                const addr = [loc.locationName, loc.address, loc.postalCode ? `S(${loc.postalCode})` : ''].filter(Boolean).join(', ');
                const hours = loc.operatingHours ? formatOperatingHours(loc.operatingHours) : '';
                return hours ? `${addr} — ${hours}` : addr;
            })
            .join('\n');
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
    const stampCards = Array.isArray(releaseItem.StampData) ? releaseItem.StampData : [];

    const releaseInfoRows = [
        { id: 'released', label: 'Released at', value: formatDateTime(releaseItem.datetime) },
        { id: 'created', label: 'Created at', value: formatDateTime(releaseItem.created_at) ?? '—' },
        { id: 'source', label: 'Source', value: (releaseItem.source ?? '—').replace(/_/g, ' ') },
        { id: 'shop_id', label: 'Shop ID', value: releaseItem.shop_id ?? '—' },
        {
            id: 'card_design',
            label: 'Card design',
            value: Array.isArray(releaseItem.Card_Design) && releaseItem.Card_Design.length === 0 ? 'None' : (Array.isArray(releaseItem.Card_Design) ? JSON.stringify(releaseItem.Card_Design) : (releaseItem.Card_Design ?? '—')),
        },
    ];

    const businessInfoRows = businessInfo
        ? [
            { id: 'biz-name', label: 'Business name', value: businessInfo.businessName ?? '—' },
            { id: 'biz-uen', label: 'UEN', value: businessInfo.uen ?? '—' },
            { id: 'biz-address', label: 'Full address', value: [businessInfo.addressUnitNumber, businessInfo.addressStreetAddress, businessInfo.addressBuildingName, businessInfo.addressPostalCode].filter(Boolean).join(', ') || '—' },
            { id: 'biz-unit', label: 'Unit number', value: businessInfo.addressUnitNumber ?? '—' },
            { id: 'biz-street', label: 'Street address', value: businessInfo.addressStreetAddress ?? '—' },
            { id: 'biz-building', label: 'Building name', value: businessInfo.addressBuildingName ?? '—' },
            { id: 'biz-postal', label: 'Postal code', value: businessInfo.addressPostalCode ?? '—' },
            { id: 'biz-shop_id', label: 'Shop ID', value: businessInfo.shop_id ?? '—' },
            ...(businessInfo.isBusinessDetailApproved != null ? [{ id: 'biz-approved', label: 'Approved', value: businessInfo.isBusinessDetailApproved === 'True' || businessInfo.isBusinessDetailApproved === true ? 'Yes' : 'No' }] : []),
            ...(businessInfo.hasAllRequiredField != null ? [{ id: 'biz-required', label: 'All required fields complete', value: businessInfo.hasAllRequiredField === true || businessInfo.hasAllRequiredField === 'true' ? 'Yes' : 'No' }] : []),
        ]
        : [];

    const stampRows = stampCards.map((card, idx) => {
        const reward = getStampRewardFromSteps(card);
        const steps = parseCardStepDetails(card.cardStepDetails);
        return {
            id: `stamp-${idx}`,
            shop_id: card.shop_id ?? '—',
            cardTitle: card.cardTitle ?? '—',
            cardDescription: card.cardDescription ?? '—',
            numberOfStamps: card.numberOfStamps ?? '—',
            termsAndConditions: card.termsAndConditions ?? '—',
            expirationType: card.expirationType ?? '—',
            numberOfDaysToExpire: card.numberOfDaysToExpire ?? '—',
            isEnabled: card.isEnabled === 'true' || card.isEnabled === true ? 'Yes' : 'No',
            hasAllRequiredField: card.hasAllRequiredField === true || card.hasAllRequiredField === 'true' ? 'Yes' : 'No',
            defaultStampedIcon: card.defaultStampedIcon === 'default' || card.defaultStampedIcon === '' ? (card.defaultStampedIcon || '—') : String(card.defaultStampedIcon ?? '—'),
            defaultUnStampedIcon: card.defaultUnStampedIcon === 'default' || card.defaultUnStampedIcon === '' ? (card.defaultUnStampedIcon || '—') : String(card.defaultUnStampedIcon ?? '—'),
            cardStepsCount: steps.length,
            rewardId: reward?.id ?? '—',
            rewardType: reward?.type ?? '—',
            rewardName: reward?.name ?? '—',
            rewardDescription: reward?.description ?? '—',
            rewardTerms: reward?.termsAndConditions ?? '—',
            rewardExpiry: reward?.expiry ?? '—',
            rewardCustomId: reward?.custom_id ?? '—',
            rewardTags: reward?.tags ?? '—',
            rewardIsCheck: reward?.isCheck != null ? String(reward.isCheck) : '—',
            rewardIsPublished: reward?.isPublished != null ? String(reward.isPublished) : '—',
        };
    });

    const stampStepRows = stampCards.flatMap((card, cardIdx) => {
        const steps = parseCardStepDetails(card.cardStepDetails);
        const cardTitle = card.cardTitle ?? '—';
        return steps.map((step, stepIdx) => {
            const stampedIcon = step.stampedIcon ?? '—';
            const unStampedIcon = step.unStampedIcon ?? '—';
            const r = step.reward;
            return {
                id: `stamp-${cardIdx}-step-${step.id ?? stepIdx}`,
                cardTitle,
                stepId: step.id ?? stepIdx + 1,
                stampedIcon: stampedIcon === 'default' ? 'default' : (typeof stampedIcon === 'object' ? JSON.stringify(stampedIcon) : String(stampedIcon)),
                unStampedIcon: unStampedIcon === 'default' ? 'default' : (typeof unStampedIcon === 'object' ? JSON.stringify(unStampedIcon) : String(unStampedIcon)),
                rewardId: r?.id ?? '—',
                rewardType: r?.type ?? '—',
                rewardName: r?.name ?? '—',
                rewardDescription: r?.description ?? '—',
                rewardTerms: r?.termsAndConditions ?? '—',
                rewardExpiry: r?.expiry ?? '—',
                rewardCustomId: r?.custom_id ?? '—',
                rewardTags: r?.tags ?? '—',
                rewardIsCheck: r?.isCheck != null ? String(r.isCheck) : '—',
                rewardIsPublished: r?.isPublished != null ? String(r.isPublished) : '—',
            };
        });
    });

    const customerFacingRows = customerFacing
        ? [
            { id: 'cf-display', label: 'Display name', value: customerFacing.displayName ?? '—' },
            { id: 'cf-desc', label: 'Description', value: customerFacing.description ?? '—' },
            { id: 'cf-category', label: 'Category', value: (customerFacing.category ?? '—').replace(/_/g, ' ') },
            ...(customerFacing.keywords ? [{ id: 'cf-keywords', label: 'Keywords', value: customerFacing.keywords }] : []),
            ...(customerFacing.locations?.length ? [{ id: 'cf-locations', label: 'Locations & hours', value: formatLocationsForDisplay(customerFacing.locations) }] : []),
            ...(customerFacing.thumbnail ? [{ id: 'cf-thumb', label: 'Thumbnail', value: customerFacing.thumbnail }] : []),
            ...(customerFacing.banner ? [{ id: 'cf-banner', label: 'Banner', value: customerFacing.banner }] : []),
            ...(customerFacing.hasAllRequiredField != null ? [{ id: 'cf-required', label: 'All required fields complete', value: customerFacing.hasAllRequiredField === true || customerFacing.hasAllRequiredField === 'true' ? 'Yes' : 'No' }] : []),
            { id: 'cf-shop_id', label: 'Shop ID', value: customerFacing.shop_id ?? '—' },
        ]
        : [];

    const scanToWinRows = rewardChances.map((chance, i) => {
        const r = chance.reward;
        return {
            id: chance.id ?? i + 1,
            chanceId: chance.id ?? '—',
            rewardId: chance.rewardId ?? '—',
            rewardName: r?.rewardName ?? r?.name ?? '—',
            rewardType: r?.rewardType ?? r?.type ?? '—',
            description: r?.description ?? '—',
            termsAndConditions: r?.termsAndConditions ?? '—',
            percentage: chance.percentage != null ? `${chance.percentage}%` : '—',
            max: chance.max != null && chance.max !== undefined ? String(chance.max) : '—',
            expiry: (r?.expiryNumberOfDays ?? r?.expiry) != null ? String(r.expiryNumberOfDays ?? r.expiry) : '—',
            customRewardId: r?.customRewardId ?? r?.custom_id ?? '—',
            rewardTags: r?.rewardTags ?? r?.tags ?? '—',
            isPublished: r?.isPublished != null ? String(r.isPublished) : '—',
        };
    });

    const releaseInfoColumns = [
        { field: 'label', headerName: 'Field', flex: 1, minWidth: 160 },
        {
            field: 'value',
            headerName: 'Value',
            flex: 2,
            minWidth: 220,
            renderCell: (params) => (
                <span className={styles.cellValueWrap}>{String(params.value ?? '—')}</span>
            ),
        },
    ];

    const stampColumns = [
        { field: 'cardTitle', headerName: 'Card title', flex: 1, minWidth: 130 },
        { field: 'cardDescription', headerName: 'Description', flex: 1, minWidth: 140 },
        { field: 'numberOfStamps', headerName: 'Stamps required', width: 110 },
        { field: 'termsAndConditions', headerName: 'Terms', flex: 1, minWidth: 100 },
        { field: 'expirationType', headerName: 'Expiry type', width: 110 },
        { field: 'numberOfDaysToExpire', headerName: 'Valid (days)', width: 100 },
        { field: 'isEnabled', headerName: 'Enabled', width: 80 },
        { field: 'rewardName', headerName: 'Reward', flex: 1, minWidth: 120 },
        { field: 'rewardDescription', headerName: 'Reward description', flex: 1, minWidth: 120 },
        { field: 'hasAllRequiredField', headerName: 'Complete', width: 85 },
        { field: 'defaultStampedIcon', headerName: 'Stamped icon', width: 100 },
        { field: 'defaultUnStampedIcon', headerName: 'Unstamped icon', width: 110 },
        { field: 'shop_id', headerName: 'Shop ID', width: 100 },
        { field: 'rewardId', headerName: 'Reward ID', width: 100 },
        { field: 'rewardType', headerName: 'Reward type', width: 100 },
        { field: 'rewardTerms', headerName: 'Reward terms', flex: 1, minWidth: 90 },
        { field: 'rewardExpiry', headerName: 'Reward expiry', width: 100 },
        { field: 'rewardCustomId', headerName: 'Custom ID', width: 90 },
        { field: 'rewardTags', headerName: 'Tags', width: 80 },
        { field: 'rewardIsCheck', headerName: 'Is check', width: 85 },
        { field: 'rewardIsPublished', headerName: 'Published', width: 85 },
    ];

    const stampStepColumns = [
        { field: 'stepId', headerName: 'Step', width: 70 },
        { field: 'cardTitle', headerName: 'Card', flex: 1, minWidth: 120 },
        { field: 'stampedIcon', headerName: 'Stamped', width: 90 },
        { field: 'unStampedIcon', headerName: 'Unstamped', width: 90 },
        { field: 'rewardName', headerName: 'Reward', flex: 1, minWidth: 120 },
        { field: 'rewardDescription', headerName: 'Reward description', flex: 1, minWidth: 110 },
        { field: 'rewardId', headerName: 'Reward ID', width: 100 },
        { field: 'rewardType', headerName: 'Type', width: 90 },
        { field: 'rewardTerms', headerName: 'Terms', flex: 1, minWidth: 90 },
        { field: 'rewardExpiry', headerName: 'Expiry', width: 80 },
        { field: 'rewardCustomId', headerName: 'Custom ID', width: 90 },
        { field: 'rewardTags', headerName: 'Tags', width: 80 },
        { field: 'rewardIsCheck', headerName: 'Is check', width: 80 },
        { field: 'rewardIsPublished', headerName: 'Published', width: 85 },
    ];

    const scanToWinColumns = [
        { field: 'rewardName', headerName: 'Reward', flex: 1, minWidth: 130 },
        { field: 'percentage', headerName: 'Chance %', width: 95 },
        { field: 'max', headerName: 'Max', width: 70 },
        { field: 'description', headerName: 'Description', flex: 1, minWidth: 120 },
        { field: 'termsAndConditions', headerName: 'Terms', flex: 1, minWidth: 90 },
        { field: 'expiry', headerName: 'Expiry (days)', width: 105 },
        { field: 'chanceId', headerName: 'Chance ID', width: 90 },
        { field: 'rewardId', headerName: 'Reward ID', width: 100 },
        { field: 'rewardType', headerName: 'Type', width: 90 },
        { field: 'customRewardId', headerName: 'Custom ID', width: 90 },
        { field: 'rewardTags', headerName: 'Tags', width: 80 },
        { field: 'isPublished', headerName: 'Published', width: 85 },
    ];

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
                <FieldHeader title="Release information" type="h3" description="When this release was submitted and from where." />
                <div className={styles.tableContainer}>
                    <DataGrid
                        rows={releaseInfoRows}
                        columns={releaseInfoColumns}
                        initialState={{ pagination: { paginationModel } }}
                        {...defaultDataGridProps}
                    />
                </div>
            </ContentCard>

            {businessInfoRows.length > 0 && (
                <ContentCard className={styles.content}>
                    <FieldHeader title="Business information" type="h3" description="Official business details included in this release." />
                    <div className={styles.tableContainer}>
                        <DataGrid
                            rows={businessInfoRows}
                            columns={releaseInfoColumns}
                            initialState={{ pagination: { paginationModel } }}
                            {...defaultDataGridProps}
                        />
                    </div>
                </ContentCard>
            )}

            {stampRows.length > 0 && (
                <ContentCard className={styles.content}>
                    <FieldHeader title="Stamp cards" type="h3" description="Stamp card setup and reward for each card in this release." />
                    <div className={styles.tableContainer}>
                        <DataGrid
                            rows={stampRows}
                            columns={stampColumns}
                            initialState={{ pagination: { paginationModel } }}
                            {...defaultDataGridProps}
                        />
                    </div>
                    {stampStepRows.length > 0 && (
                        <>
                            <FieldHeader title="Stamp card steps" type="h3" className={styles.stampStepsHeader} description="Each step on the stamp card and its reward (if any)." />
                            <div className={styles.tableContainer}>
                                <DataGrid
                                    rows={stampStepRows}
                                    columns={stampStepColumns}
                                    initialState={{ pagination: { paginationModel } }}
                                    {...defaultDataGridProps}
                                />
                            </div>
                        </>
                    )}
                </ContentCard>
            )}

            {customerFacingRows.length > 0 && (
                <ContentCard className={styles.content}>
                    <FieldHeader title="Customer facing details" type="h3" description="What customers see: name, description, category, locations and hours." />
                    <div className={styles.tableContainer}>
                        <DataGrid
                            rows={customerFacingRows}
                            columns={releaseInfoColumns}
                            initialState={{ pagination: { paginationModel } }}
                            {...defaultDataGridProps}
                        />
                    </div>
                </ContentCard>
            )}

            {qrConfig && (rewardChances.length > 0 || qrConfig.cardImage) && (
                <ContentCard className={styles.content}>
                    <FieldHeader title="Scan to Win" type="h3" description="QR scan-to-win configuration and reward chances." />
                    <div className={styles.tableContainer}>
                        <DataGrid
                            rows={[
                                { id: 'qr-enabled', label: 'Enabled', value: qrConfig.isEnabled === 'true' || qrConfig.isEnabled === true ? 'Yes' : 'No' },
                                { id: 'qr-shop_id', label: 'Shop ID', value: qrConfig.shop_id ?? '—' },
                                ...(qrConfig.cardImage ? [{ id: 'qr-cardImage', label: 'Card image', value: qrConfig.cardImage }] : []),
                            ]}
                            columns={releaseInfoColumns}
                            initialState={{ pagination: { paginationModel } }}
                            {...defaultDataGridProps}
                        />
                    </div>
                    {scanToWinRows.length > 0 && (
                        <>
                            <FieldHeader title="Reward chances" type="h3" className={styles.stampStepsHeader} description="Each possible reward and its chance percentage." />
                            <div className={styles.tableContainer}>
                                <DataGrid
                                    rows={scanToWinRows}
                                    columns={scanToWinColumns}
                                    initialState={{ pagination: { paginationModel } }}
                                    {...defaultDataGridProps}
                                />
                            </div>
                        </>
                    )}
                </ContentCard>
            )}
        </form>
    );
};

export default HistoryDetailView;

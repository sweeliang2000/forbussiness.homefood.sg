'use client';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './rewards.module.css';
import RewardsHeader from './_views/RewardsHeader';
import CreateRewardPopup from './_views/CreateRewardPopup';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RewardsLists from './_views/RewardsLists';
import AlertModal from '@/components/AlertModal/AlertModal';
import apiClient from '@/utility/api';
import { REWARDS, CREATE_REWARD, UPDATE_REWARD, DELETE_REWARD, ARCHIVE_REWARD, RELEASE_STATUS } from '@/utility/apiPaths';

const VALID_REWARD_TYPES = ['stampReward', 'scanToWinReward'];

const Rewards = () => {
    const searchParams = useSearchParams();
    const rewardTypeFromUrl = searchParams.get('reward_type');
    const [isCreateNewRewardOpen, setIsCreateNewRewardOpen] = useState(false);
    const [selectedReward, setSelectedReward] = useState(null);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [archiveError, setArchiveError] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEdit, setIsEdit] = useState(true);
    const [releaseStatus, setReleaseStatus] = useState(null);

    const fetchRewards = useCallback(async () => {
        try {
            setLoading(true);
            const params =
                rewardTypeFromUrl && VALID_REWARD_TYPES.includes(rewardTypeFromUrl)
                    ? { reward_type: rewardTypeFromUrl }
                    : {};
            const response = await apiClient.get(REWARDS, { params });
            console.log('Rewards response:', response.data);
            const data = response.data.data;
            const isEditValue = data.isEdit;
            setIsEdit(isEditValue !== undefined ? isEditValue : true);
            const apiRewards = data.rewards;
            const currently_stamp = data.currently_stamp || [];
            const currently_scanReward = data.currently_scanReward;
            const live_in_used_stamp = data.live_in_used_stamp || [];
            const live_in_used_scan = data.live_in_used_scan || [];

            // Currently selected: from stamp (items with .reward) and from scan (parsed JSON rewardId)
            const selectedFromStamp = currently_stamp
                .filter(item => item.reward)
                .map(item => item.reward.id);
            const selectedFromScan = (() => {
                try {
                    const parsed = typeof currently_scanReward === 'string'
                        ? JSON.parse(currently_scanReward || '[]')
                        : (currently_scanReward || []);
                    return Array.isArray(parsed) ? parsed.map(c => c.rewardId).filter(Boolean) : [];
                } catch {
                    return [];
                }
            })();
            const selectedRewardIds = [...new Set([...selectedFromStamp, ...selectedFromScan])];

            // Live in use: from stamp (items with .reward) and from scan (rewardChances.rewardId)
            const liveFromStamp = live_in_used_stamp
                .filter(item => item.reward)
                .map(item => item.reward.id);
            const liveFromScan = live_in_used_scan.flatMap(item => {
                try {
                    const chances = typeof item.rewardChances === 'string'
                        ? JSON.parse(item.rewardChances || '[]')
                        : (item.rewardChances || []);
                    return Array.isArray(chances) ? chances.map(c => c.rewardId).filter(Boolean) : [];
                } catch {
                    return [];
                }
            });
            const liveInUseRewardIds = [...new Set([...liveFromStamp, ...liveFromScan])];

            // Transform API response to match expected structure
            const transformedRewards = (apiRewards || []).map(reward => ({
                id: reward.reward_id,
                type: reward.rewardType || 'stampReward',
                name: reward.rewardName || 'Unnamed Reward',
                description: reward.description || 'No description available',
                termsAndConditions: reward.termsAndConditions || reward.terms_and_conditions || '',
                image: {
                    url: reward.rewardImage || '/images/placeholder/reward_placeholder.png'
                },
                expiry: reward.expiryNumberOfDays?.toString() || '30',
                custom_id: reward.customRewardId || '',
                tags: reward.rewardTags || '',
                isCheck: selectedRewardIds.includes(reward.reward_id),
                isPublished: liveInUseRewardIds.includes(reward.reward_id)
            }));

            console.log('Transformed rewards:', transformedRewards);
            
            setRewards(transformedRewards);
        } catch (err) {
            const errorData = err?.response?.data;
            const message = errorData?.error?.message;
            const code = errorData?.error?.statusCode;
            console.error(`Error fetching rewards: ${message} (Error code: ${code})`);
            setError('Failed to load rewards');
        } finally {
            setLoading(false);
        }
    }, [rewardTypeFromUrl]);

    useEffect(() => {
        fetchRewards();
    }, [fetchRewards]);

    // Fetch release status to determine messaging when not editable
    useEffect(() => {
        const fetchReleaseStatus = async () => {
            try {
                const response = await apiClient.get(RELEASE_STATUS);
                const data = response.data;
                if (data && data.data && data.data.status) {
                    setReleaseStatus(data.data.status);
                }
            } catch {
                // Silently ignore errors for release status; it is not critical for this page
            }
        };

        fetchReleaseStatus();
    }, []);

    const onCardSelected = (reward) => {
        setSelectedReward(reward)
        setIsCreateNewRewardOpen(true)
    };

    const onArchive = () => {
        setIsArchiveModalOpen(true);
    }

    const handleArchiveConfirm = async () => {
        setArchiveError(null);
        try {
            if (selectedReward && selectedReward.id) {
                const response = await apiClient.put(ARCHIVE_REWARD, {
                    reward_id: selectedReward.id
                });

                if (response.status === 200 || response.status === 204) {
                    await fetchRewards();
                    setIsArchiveModalOpen(false);
                    setIsCreateNewRewardOpen(false);
                    setSelectedReward(null);
                } else {
                    const errorData = response.data;
                    const msg = errorData?.error && errorData?.details
                        ? `${errorData.error} ${errorData.details}`
                        : errorData?.error || 'Failed to archive reward.';
                    setArchiveError(msg);
                    setIsArchiveModalOpen(false);
                }
            }
        } catch (err) {
            const errorData = err?.response?.data;
            const errorMsg = errorData?.error;
            const details = errorData?.details;
            const displayMsg = errorMsg && details
                ? `${errorMsg} ${details}`
                : errorMsg || err?.message || 'Unable to archive reward.';
            setArchiveError(displayMsg);
            setIsArchiveModalOpen(false);
        }
    };

    const handleSubmitReward = async (formData) => {
        try {
            console.log('Received form data:', formData);
            console.log('Image data:', formData.image);
            console.log('Selected reward:', selectedReward);
            
            // Create FormData for multipart/form-data submission
            const submitFormData = new FormData();
            
            // Add text fields
            submitFormData.append('rewardType', formData.type);
            submitFormData.append('rewardName', formData.name);
            submitFormData.append('description', formData.description);
            // Send terms & conditions with reward create/update
            submitFormData.append('termsAndConditions', formData.termsAndConditions || '');
            submitFormData.append('expiryType', formData.expiry_type || 'expiryInDays');
            submitFormData.append('expiryNumberOfDays', formData.expiry || '30');
            submitFormData.append('customRewardId', formData.custom_id || '');
            submitFormData.append('rewardTags', formData.tags || '');

            // Add image file if present
            if (formData.image && formData.image.file) {
                submitFormData.append('rewardImage', formData.image.file);
                console.log('Image file appended:', formData.image.file);
            } else {
                console.log('No image file found');
            }

            let response;
            let isUpdate = selectedReward !== null;

            if (isUpdate) {
                // Update existing reward
                console.log('Updating reward with ID:', selectedReward.id);
                submitFormData.append('reward_id', selectedReward.id);
                
                response = await apiClient.put(UPDATE_REWARD, submitFormData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                // Create new reward
                console.log('Creating new reward');
                response = await apiClient.post(CREATE_REWARD, submitFormData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }
            
            if (response.status === 200 || response.status === 201) {
                // Refresh the rewards list after successful creation/update
                await fetchRewards();
                setIsCreateNewRewardOpen(false);
                setSelectedReward(null);
                console.log(`Reward ${isUpdate ? 'updated' : 'created'} successfully`);
            }
        } catch (err) {
            const errorData = err?.response?.data;
            const message = errorData?.error?.message;
            const code = errorData?.error?.statusCode;
            console.error(`Error ${selectedReward ? 'updating' : 'creating'} reward: ${message} (Error code: ${code})`);
            throw err; // Rethrow so CreateRewardPopup can catch and display the error
        }
    };

    return (
        <div>
            <RewardsHeader
                onCreate={() => {
                    setSelectedReward(null)
                    setIsCreateNewRewardOpen(true)
                }}
                isEdit={isEdit}
                releaseStatus={releaseStatus}
            />

            <CreateRewardPopup
                isOpen={isCreateNewRewardOpen}
                setIsOpen={(open) => {
                    if (!open) setArchiveError(null);
                    setIsCreateNewRewardOpen(open);
                }}
                selectedReward={selectedReward}
                onArchive={selectedReward ? onArchive : null}
                onSubmit={handleSubmitReward}
                archiveError={archiveError}
                onClearArchiveError={() => setArchiveError(null)}
            />

            <AlertModal
                open={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                title="Archive Reward"
                description="Once archived, you will not be able to restore this reward. If your customers are still holding this reward, they will still be able to use it. Are you sure you want to archive?"
                onAction={handleArchiveConfirm}
                actionButtonText="Archive"
                type="error"
                sx={{ 
                    zIndex: 1500,
                    '& .MuiDialog-paper': {
                        maxWidth: '480px',
                        width: '80%'
                    }
                }}
            />

            <ContentCard className={styles.legendContainer}>
                <div className={styles.legendItems}>
                    <div className={styles.legendItem}>
                        <span className={`${styles.legendTag} ${styles.selectedTag}`}>Currently Selected</span>
                        <p className={styles.legendDescription}>This reward is actively selected in a rewardcard (but maybe not published and visable in app).</p>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={`${styles.legendTag} ${styles.publishedTag}`}>Live and In Use</span>
                        <p className={styles.legendDescription}>This reward is already published and visable in app to your customers.</p>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={`${styles.legendTag} ${styles.notUsedTag}`}>Not Used</span>
                        <p className={styles.legendDescription}>This reward is not currently selected or published and is not visible to customers.</p>
                    </div>
                </div>
            </ContentCard>

            <RewardsLists 
                rewards={rewards}
                loading={loading}
                error={error}
                onCardSelected={onCardSelected}
            />
        </div>
    )
};

export default Rewards;
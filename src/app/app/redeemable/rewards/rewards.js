'use client';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './rewards.module.css';
import RewardsHeader from './_views/RewardsHeader';
import CreateRewardPopup from './_views/CreateRewardPopup';
import { use, useEffect, useState } from 'react';
import RewardsLists from './_views/RewardsLists';
import AlertModal from '@/components/AlertModal/AlertModal';
import RewardCard from './_views/RewardCard';
import apiClient from '@/utility/api';
import { REWARDS, CREATE_REWARD } from '@/utility/apiPaths';

const Rewards = () => {
    const [isCreateNewRewardOpen, setIsCreateNewRewardOpen] = useState(false);
    const [selectedReward, setSelectedReward] = useState(null);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(REWARDS);
            const apiRewards = response.data.data;
            console.log('API rewards:', apiRewards);    
            
            // Transform API response to match expected structure
            const transformedRewards = apiRewards.map(reward => ({
                id: reward.reward_id,
                type: reward.rewardType || 'stampReward',
                name: reward.rewardName || 'Unnamed Reward',
                description: reward.description || 'No description available',
                image: {
                    url: reward.rewardImage || '/images/placeholder/reward_placeholder.png'
                },
                expiry: reward.expiryNumberOfDays?.toString() || '30',
                custom_id: reward.customRewardId || '',
                tags: reward.rewardTags || '',
                isCheck: reward.isCheck === 'true' || reward.isCheck === true,
                isPublished: reward.isPublished === 'true' || reward.isPublished === true
            }));

            console.log('Transformed rewards:', transformedRewards);
            
            setRewards(transformedRewards);
        } catch (err) {
            console.error('Error fetching rewards:', err);
            setError('Failed to load rewards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const onCardSelected = (reward) => {
        setSelectedReward(reward)
        setIsCreateNewRewardOpen(true)
    };

    const onArchive = () => {
        setIsArchiveModalOpen(true);
    }

    const handleArchiveConfirm = () => {
        // Implement the actual archive functionality here
        console.log('Archive confirmed for reward:', selectedReward);
        setIsArchiveModalOpen(false);
        setIsCreateNewRewardOpen(false);
    }

    const handleSubmitReward = async (formData) => {
        try {
            console.log('Received form data:', formData);
            console.log('Image data:', formData.image);
            
            // Create FormData for multipart/form-data submission
            const submitFormData = new FormData();
            
            // Add text fields
            submitFormData.append('rewardType', formData.type);
            submitFormData.append('rewardName', formData.name);
            submitFormData.append('description', formData.description);
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

            const response = await apiClient.post(CREATE_REWARD, submitFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            if (response.status === 200 || response.status === 201) {
                // Refresh the rewards list after successful creation
                await fetchRewards();
                setIsCreateNewRewardOpen(false);
                setSelectedReward(null);
            }
        } catch (err) {
            console.error('Error creating reward:', err);
            // You might want to show an error message to the user here
        }
    };

    return (
        <div>
            <RewardsHeader
                onCreate={() => {
                    setSelectedReward(null)
                    setIsCreateNewRewardOpen(true)
                }}
            />

            <CreateRewardPopup
                isOpen={isCreateNewRewardOpen}
                setIsOpen={setIsCreateNewRewardOpen}
                selectedReward={selectedReward}
                onArchive={selectedReward ? onArchive : null}
                onSubmit={handleSubmitReward}
            />

            <AlertModal
                open={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                title="Archive Reward"
                description="Archiving will fully remove this reward from customer view only after it has been published to the app. Are you sure you want to archive this reward?"
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
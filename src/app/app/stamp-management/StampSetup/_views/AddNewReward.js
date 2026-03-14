'use client';
import styles from './AddNewReward.module.css';
import RewardCard from '@/app/app/redeemable/rewards/_views/RewardCard';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import CreateRewardPopup from '@/app/app/redeemable/rewards/_views/CreateRewardPopup';
import { useCallback, useState, useEffect } from 'react';
import apiClient from '@/utility/api';
import { REWARDS, CREATE_REWARD } from '@/utility/apiPaths';
import { Button } from '@mui/material';

const AddNewReward = ({
    isOpen,
    setIsOpen,
    onSave,
    currentReward,
    restrictToScanToWin = false
}) => {
    const [selected, setSelected] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateRewardOpen, setIsCreateRewardOpen] = useState(false);
    const [selectedReward, setSelectedReward] = useState(null);

    const fetchRewards = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get(REWARDS);
            const data = response.data.data
            const apiRewards = data.rewards;
            const currently_selected = data.currently_selected;
            
            // Filter currently_selected to only get items with rewards and extract the reward IDs
            const selectedRewards = currently_selected
                ?.filter(item => item.reward)
                ?.map(item => item.reward.id) || [];

            console.log('selectedRewards', selectedRewards);
            
            // Transform API response to match expected structure
            const transformedRewards = (apiRewards || []).map(reward => ({
                id: reward.reward_id,
                type: reward.rewardType || 'stampReward',
                name: reward.rewardName || 'Unnamed Reward',
                description: reward.description || 'No description available',
                // Include terms & conditions when fetching (support both API shapes)
                termsAndConditions: reward.termsAndConditions || reward.terms_and_conditions || '',
                image: {
                    url: reward.rewardImage || '/images/placeholder/reward_placeholder.png'
                },
                expiry: reward.expiryNumberOfDays?.toString() || '30',
                custom_id: reward.customRewardId || '',
                tags: reward.rewardTags || '',
                isCheck: selectedRewards.includes(reward.reward_id),
                isPublished: reward.isPublished === 'true' || reward.isPublished === true
            }));

            console.log('transformedRewards', transformedRewards);
            
            // Filter rewards based on restrictToScanToWin prop
            // If restrictToScanToWin is true, only show scanToWinReward type
            // If restrictToScanToWin is false, only show stampReward type
            const filteredRewards = restrictToScanToWin
                ? transformedRewards.filter(reward => reward.type === 'scanToWinReward')
                : transformedRewards.filter(reward => reward.type === 'stampReward');
            
            setRewards(filteredRewards);
        } catch (err) {
            const errorData = err?.response?.data;
            const message = errorData?.error?.message;
            const code = errorData?.error?.statusCode;
            console.error(`Error fetching rewards: ${message} (Error code: ${code})`);
            setError('Failed to load rewards');
        } finally {
            setLoading(false);
        }
    }, [restrictToScanToWin]);

    useEffect(() => {
        if (isOpen) {
            fetchRewards();
            // Reset selected when dialog opens only if no currentReward is provided
            if (!currentReward) {
                setSelected(null);
            }
        }
    }, [isOpen, currentReward, fetchRewards]);

    // Set selected reward when rewards are loaded and currentReward is provided
    useEffect(() => {
        if (currentReward && rewards.length > 0 && isOpen) {
            // Find the matching reward in the fetched rewards by ID
            const matchingReward = rewards.find(reward => reward.id === currentReward.id);
            if (matchingReward) {
                setSelected(matchingReward);
            }
        }
    }, [rewards, currentReward, isOpen]);

    const saveHandler = (event) => {
        event.preventDefault();
        onSave(selected);
        setIsOpen(false);
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
            // Send terms & conditions with reward creation
            submitFormData.append('termsAndConditions', formData.termsAndConditions || '');
            submitFormData.append('expiryType', formData.expiry_type || 'expiryInDays');
            submitFormData.append('expiryNumberOfDays', formData.expiry || '30');
            submitFormData.append('customRewardId', formData.custom_id || '');
            submitFormData.append('rewardTags', formData.tags || '');

            // Add image file if present
            if (formData.image && formData.image.file) {
                submitFormData.append('rewardImage', formData.image.file);
                console.log('Image file appended:', formData.image.file);
            }

            // Create new reward
            const response = await apiClient.post(CREATE_REWARD, submitFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            if (response.status === 200 || response.status === 201) {
                // Refresh the rewards list after successful creation
                await fetchRewards();
                setIsCreateRewardOpen(false);
                setSelectedReward(null);
                console.log('Reward created successfully');
                
                // Optionally select the newly created reward
                // You may need to extract the reward ID from the response
                // For now, we'll just refresh the list
            }
        } catch (err) {
            const errorData = err?.response?.data;
            const message = errorData?.error?.message;
            const code = errorData?.error?.statusCode;
            console.error(`Error creating reward: ${message} (Error code: ${code})`);
            throw err; // Rethrow so CreateRewardPopup can catch and display the error
        }
    };

    return(
        <DialogPopup
            title='Add Reward'
            actionTitle='Add'
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            PaperProps={{
                sx: {
                    width: '80%',
                    maxWidth: '540px',
                    maxHeight: '60vh',
                },
            }}
            onSubmit={saveHandler}
        >
            <div className={styles.container}>
                <div className={styles.header}>
                    <Button
                        type='button'
                        size='small'
                        variant='contained'
                        className={styles.createButton}
                        onClick={() => {
                            setSelectedReward(null);
                            setIsCreateRewardOpen(true);
                        }}
                    >
                        Create New Reward
                    </Button>
                </div>

                {loading ? (
                    <div>
                        <div>Loading rewards...</div>
                    </div>
                ) : error ? (
                    <div>
                        <div>Error: {error}</div>
                    </div>
                ) : rewards.length === 0 ? (
                    <div>
                        <div>No rewards available</div>
                    </div>
                ) : (
                    <div className={styles.rewardsGrid}>
                        {rewards.map((reward) => <RewardCard
                            key={reward.id}
                            reward={reward}
                            isSelectable={true}
                            currentCheck={selected?.id === reward.id}
                            disableTags={true}
                            onClick={() => { 
                                console.log('reward', reward);  
                                setSelected(reward) }} />)}
                    </div>
                )}
            </div>

            <CreateRewardPopup
                isOpen={isCreateRewardOpen}
                setIsOpen={setIsCreateRewardOpen}
                selectedReward={selectedReward}
                onArchive={null}
                onSubmit={handleSubmitReward}
                allowedRewardTypes={
                    restrictToScanToWin 
                        ? [{ value: 'scanToWinReward', title: 'Scan to Win Reward' }]
                        : [{ value: 'stampReward', title: 'Stamp Reward' }]
                }
            />
        </DialogPopup>
    )
};

export default AddNewReward;
'use client';
import styles from './AddNewReward.module.css';
import RewardCard from '@/app/app/redeemable/rewards/_views/RewardCard';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import { useState, useEffect } from 'react';
import apiClient from '@/utility/api';
import { REWARDS } from '@/utility/apiPaths';

const AddNewReward = ({
    isOpen,
    setIsOpen,
    onSave
}) => {
    const [selected, setSelected] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRewards = async () => {
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
            
            // Transform API response to match expected structure
            const transformedRewards = (apiRewards || []).map(reward => ({
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
                isCheck: selectedRewards.includes(reward.reward_id),
                isPublished: reward.isPublished === 'true' || reward.isPublished === true
            }));
            
            setRewards(transformedRewards);
        } catch (err) {
            console.error('Error fetching rewards:', err);
            setError('Failed to load rewards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRewards();
        }
    }, [isOpen]);

    const saveHandler = (event) => {
        event.preventDefault();
        onSave(selected);
        setIsOpen(false);
    }

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
                    rewards.map((reward) => <RewardCard
                        key={reward.id}
                        reward={reward}
                        isSelectable={true}
                        currentCheck={true}
                        disableTags={true}
                        onClick={() => { 
                            console.log('reward', reward);  
                            setSelected(reward) }} />)
                )}
            </div>
        </DialogPopup>
    )
};

export default AddNewReward;
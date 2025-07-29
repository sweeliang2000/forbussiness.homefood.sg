'use client';
import { useState, useEffect } from 'react';
import styles from './RewardsLists.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import apiClient from '@/utility/api';
import { REWARDS } from '@/utility/apiPaths';
import RewardCard from './RewardCard';

const RewardsLists = ({
    onCardSelected
}) => {
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRewards = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get(REWARDS);
                const apiRewards = response.data.data;
                
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
                    in_used: true // Default to true as per the sample data pattern
                }));
                
                setRewards(transformedRewards);
            } catch (err) {
                console.error('Error fetching rewards:', err);
                setError('Failed to load rewards');
            } finally {
                setLoading(false);
            }
        };

        fetchRewards();
    }, []);

    if (loading) {
        return (
            <ContentCard className={styles.container}>
                <div>Loading rewards...</div>
            </ContentCard>
        );
    }

    if (error) {
        return (
            <ContentCard className={styles.container}>
                <div>Error: {error}</div>
            </ContentCard>
        );
    }

    return (
        <ContentCard className={styles.container}>
            {
                rewards.map((reward) => <RewardCard
                    key={reward.id}
                    reward={reward}
                    isCheck={true}
                    isPublished={true}
                    onClick={() => { onCardSelected(reward) }} />)
            }
        </ContentCard>
    )
};

export default RewardsLists;
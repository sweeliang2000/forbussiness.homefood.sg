'use client';
import styles from './RewardsLists.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import RewardCard from './RewardCard';

const RewardsLists = ({
    rewards,
    loading,
    error,
    onCardSelected,
    hasRewards = false,
    hasActiveFilters = false
}) => {
    if (loading) {
        return (
            <ContentCard className={styles.messageContainer}>
                <div>Loading rewards...</div>
            </ContentCard>
        );
    }

    if (error) {
        return (
            <ContentCard className={styles.messageContainer}>
                <div>Error: {error}</div>
            </ContentCard>
        );
    }

    if (rewards.length === 0) {
        const emptyMessage = hasRewards && hasActiveFilters
            ? 'No rewards match your filters. Try changing the status.'
            : 'No reward available. Start creating';
        return (
            <ContentCard className={styles.messageContainer}>
                <div>{emptyMessage}</div>
            </ContentCard>
        );
    }

    return (
        <ContentCard className={styles.container}>
            {
                rewards.map((reward) => <RewardCard
                    key={reward.id}
                    reward={reward}
                    isSelectable={false} // Not used here
                    onClick={() => { onCardSelected(reward) }} />)
            }
        </ContentCard>
    )
};

export default RewardsLists;
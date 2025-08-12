'use client';
import styles from './RewardsLists.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import RewardCard from './RewardCard';

const RewardsLists = ({
    rewards,
    loading,
    error,
    onCardSelected
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
        return (
            <ContentCard className={styles.messageContainer}>
                <div>No reward available. Start creating</div>
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
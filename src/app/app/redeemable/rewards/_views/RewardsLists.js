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
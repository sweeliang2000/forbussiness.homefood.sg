'use client';
import styles from './RewardsLists.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { REWARDS_SAMPLE } from "@/sample_data/reward_sample";
import RewardCard from './RewardCard';

const RewardsLists = ({
    onCardSelected
}) => {
    const rewards = REWARDS_SAMPLE;

    return (
        <ContentCard className={styles.container}>
            {
                rewards.map((reward) => <RewardCard
                    key={reward.id}
                    reward={reward}
                    onClick={() => { onCardSelected(reward) }} />)
            }
        </ContentCard>
    )
};

export default RewardsLists;
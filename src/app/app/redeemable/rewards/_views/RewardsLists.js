'use client';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './RewardsLists.module.css';
import { REWARDS_SAMPLE } from "@/sample_data/reward_sample";
import Image from "next/image";
import RewardCard from './RewardCard';

const RewardsLists = () => {
    const rewards = REWARDS_SAMPLE;

    return (
        <ContentCard className={styles.container}>
            {
                rewards.map((reward) => <RewardCard key={reward.id} reward={reward}/>)
            }
        </ContentCard>
    )
};

export default RewardsLists;
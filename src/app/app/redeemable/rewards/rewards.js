'use client';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './rewards.module.css';
import { LoadingButton } from '@mui/lab';
import { Button } from '@mui/material';
import RewardsHeader from './_views/RewardsHeader';
import CreateRewardPopup from './_views/CreateRewardPopup';
import { use, useEffect, useState } from 'react';
import RewardsLists from './_views/RewardsLists';

const Rewards = () => {
    const [isCreateNewRewardOpen, setIsCreateNewRewardOpen] = useState(false);
    const [selectedReward, setSelectedReward] = useState(null);

    const onCardSelected = (reward) => {
        setSelectedReward(reward)
        setIsCreateNewRewardOpen(true)
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
            />

            <RewardsLists onCardSelected={onCardSelected} />
        </div>
    )
};

export default Rewards;
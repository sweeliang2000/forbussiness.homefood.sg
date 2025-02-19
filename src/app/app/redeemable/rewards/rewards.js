'use client';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './rewards.module.css';
import { LoadingButton } from '@mui/lab';
import { Button } from '@mui/material';
import RewardsHeader from './_views/RewardsHeader';
import CreateRewardPopup from './_views/CreateRewardPopup';
import { useState } from 'react';
import RewardsLists from './_views/RewardsLists';

const Rewards = () => {
    const [isCreateNewRewardOpen, setIsCreateNewRewardOpen] = useState(false);
    
    return (
        <div>
            <RewardsHeader
                onCreate={() => { setIsCreateNewRewardOpen(true) }}
            />

            <CreateRewardPopup
                isOpen={isCreateNewRewardOpen}
                setIsOpen={setIsCreateNewRewardOpen}
            />

            <RewardsLists/>
        </div>
    )
};

export default Rewards;
'use client';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './rewards.module.css';
import RewardsHeader from './_views/RewardsHeader';
import CreateRewardPopup from './_views/CreateRewardPopup';
import { use, useEffect, useState } from 'react';
import RewardsLists from './_views/RewardsLists';
import AlertModal from '@/components/AlertModal/AlertModal';
import RewardCard from './_views/RewardCard';

const Rewards = () => {
    const [isCreateNewRewardOpen, setIsCreateNewRewardOpen] = useState(false);
    const [selectedReward, setSelectedReward] = useState(null);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    const onCardSelected = (reward) => {
        setSelectedReward(reward)
        setIsCreateNewRewardOpen(true)
    };

    const onArchive = () => {
        console.log('Archive')
        setIsArchiveModalOpen(true);
    }

    const handleArchiveConfirm = () => {
        // Implement the actual archive functionality here
        console.log('Archive confirmed for reward:', selectedReward);
        setIsArchiveModalOpen(false);
        setIsCreateNewRewardOpen(false);
    }

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
                onArchive={selectedReward ? onArchive : null}
            />

            <AlertModal
                open={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                title="Archive Reward"
                description="Archiving will fully remove this reward from customer view only after it has been published to the app. Are you sure you want to archive this reward?"
                onAction={handleArchiveConfirm}
                actionButtonText="Archive"
                type="error"
                sx={{ 
                    zIndex: 1500,
                    '& .MuiDialog-paper': {
                        maxWidth: '480px',
                        width: '80%'
                    }
                }}
            />

            <ContentCard className={styles.legendContainer}>
                <div className={styles.legendItems}>
                    <div className={styles.legendItem}>
                        <span className={`${styles.legendTag} ${styles.selectedTag}`}>Currently Selected</span>
                        <p className={styles.legendDescription}>This reward is actively selected in a rewardcard (but maybe not published and visable in app).</p>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={`${styles.legendTag} ${styles.publishedTag}`}>Live and In Use</span>
                        <p className={styles.legendDescription}>This reward is already published and visable in app to your customers.</p>
                    </div>
                </div>
            </ContentCard>

            <RewardsLists onCardSelected={onCardSelected} />
        </div>
    )
};

export default Rewards;
'use client';
import styles from './AddNewReward.module.css';
import RewardCard from '@/app/app/redeemable/rewards/_views/RewardCard';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import { REWARDS_SAMPLE } from "@/sample_data/reward_sample";
import { useState } from 'react';

const AddNewReward = ({
    isOpen,
    setIsOpen,
    onSave
}) => {
    const [selected, setSelected] = useState(null);
    const rewards = REWARDS_SAMPLE;


    const saveHandler = (event) => {
        event.preventDefault();
        onSave(selected);
        setIsOpen(false);
    }

    return(
        <DialogPopup
            title='Add New Reward'
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
                {
                    rewards.map((reward) => <RewardCard
                        key={reward.id}
                        reward={reward}
                        isSelectable={true}
                        isCheck={selected && (selected.id === reward.id)}
                        onClick={() => { setSelected(reward) }} />)
                }
            </div>
        </DialogPopup>
    )
};

export default AddNewReward;
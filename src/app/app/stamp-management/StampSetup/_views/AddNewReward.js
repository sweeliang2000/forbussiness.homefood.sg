import styles from './AddNewReward.module.css';
import RewardCard from '@/app/app/redeemable/rewards/_views/RewardCard';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import { REWARDS_SAMPLE } from "@/sample_data/reward_sample";

const AddNewReward = ({
    isOpen,
    setIsOpen
}) => {
    const rewards = REWARDS_SAMPLE;

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
        >
            <div className={styles.container}>
                {
                    rewards.map((reward) => <RewardCard
                        key={reward.id}
                        reward={reward}
                        onClick={() => { onCardSelected(reward) }} />)
                }
            </div>

        </DialogPopup>
    )
};

export default AddNewReward;
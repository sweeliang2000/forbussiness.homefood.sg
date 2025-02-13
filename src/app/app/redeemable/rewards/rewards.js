import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './rewards.module.css';
import { LoadingButton } from '@mui/lab';
import { Button } from '@mui/material';
import RewardsHeader from './_views/RewardsHeader';
import CreateRewardPopup from './_views/CreateRewardPopup';

const Rewards = () => {
    return (
        <div>
            <RewardsHeader/>

            <CreateRewardPopup/>
        </div>
    )
};

export default Rewards;
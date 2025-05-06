'use client';
import { useRouter } from 'next/navigation';
import GeneralActionCell from '../_views/GeneralActionCell';
import styles from './UpgradeCell.module.css';

const UpgradeCell = () => {
    const router = useRouter();

    return (
        <GeneralActionCell
            title='Upgrade to Premium'
            description='Unlock premium features and get access to advanced tools to grow your business.'
            buttonTitle={'Upgrade Now'}
            onClick={() => {
                router.push('/app/subscription');
            }}
            type="primary"
        />
    );
}

export default UpgradeCell; 
// https://console.stampme.com/stamp-cards/editcard
import { LoadingButton } from '@mui/lab';
import styles from './AccountSetting.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import Link from 'next/link';
import ActionCell from './_views/DangerActionCell';
import SignOutAllSessionCell from './_components/SignOutAllSessionsCell';
import DeleteAccount from './_components/DeleteAccount';
import SignoutSection from './_components/SignoutSection';

const AccountSetting = () => {
    return (
        <>
            <div className={styles.container}>
                <ContentCard className={styles.content}>
                    <div>
                        <h2>Account and Subscription</h2>
                        <p>you@example.com</p>
                        <p>Account Type: Free</p>
                        <p>Change Password</p>
                    </div>
                </ContentCard>

                <ContentCard className={`${styles.content} ${styles.danger}`}>
                    <div>
                        <h2>Danger Zone</h2>
                        
                        <div>
                            <SignOutAllSessionCell/>
                            <DeleteAccount/>
                        </div>
                    </div>
                </ContentCard>

                <SignoutSection/>
            </div>
        </>
    )
};

export default AccountSetting;
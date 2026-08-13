import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './RewardsHeader.module.css';
import { Button } from '@mui/material';
import Alert from '@mui/material/Alert';
import Link from 'next/link';

const RewardsHeader = ({
    onCreate,
    isEdit = true,
    releaseStatus = null,
}) => {
    const showUnderReview = !isEdit;

    return (
        <div className={styles.wrapper}>
            <ContentCard className={styles.header}>
                <div className={styles.container}>
                    <div className={styles.titleSection}>
                        <h1 className={styles.title}>Rewards Management</h1>

                        <Button
                            type='submit'
                            size='small'
                            variant='contained'
                            className={styles.button}
                            onClick={onCreate}
                            disabled={!isEdit}
                        >
                            Create
                        </Button>
                    </div>

                    <p className={styles.description}>
                        This information shows all the rewards you have created. However, not all is published and seen by the public.
                    </p>

                </div>
            </ContentCard>
            {showApprovedScheduled && (
                <Alert severity="success" className={styles.alert}>
                    Your release has been approved. It will be released on the date you stated on{' '}
                    <Link href="/app/release/submission">Release Submission Page</Link>.
                    {' '}If you wish to change the date, cancel and re-send for approval. For any enquiry or urgent release, please email support@homefood.sg.
                </Alert>
            )}
            {showUnderReview && (
                <Alert severity="info" className={styles.alert}>
                    The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.
                </Alert>
            )}
        </div>
    )
};

export default RewardsHeader;
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './RewardsHeader.module.css';
import { Button } from '@mui/material';

const RewardsHeader = ({
    onCreate
}) => {
    return (
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
                    >
                        Create
                    </Button>
                </div>

                <p className={styles.description}>
                    This information shows all the rewards you have created. However, not all is published and seen by the public.
                </p>

            </div>
        </ContentCard>
    )
};

export default RewardsHeader;
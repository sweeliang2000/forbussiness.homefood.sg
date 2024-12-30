import styles from './HeaderSection.module.css';
import { ContentCard } from "../ContentCard/ContentCard";
import { LoadingButton } from '@mui/lab';

export const HeaderSection = ({
    title,
    description,
    className,
    ...props
}) => {
    return (
        <ContentCard className={`${className} ${styles.informationCard}`}>
            <div className={styles.titleSection}>
                <h1 className={styles.title}>{title}</h1>

                <LoadingButton
                    type='submit'
                    size="small"
                    loadingPosition="start"
                    variant="contained"
                    className={styles.loadingButton}
                    {...props}
                >
                    Save
                </LoadingButton>

            </div>
            <div className={styles.description}>{description}</div>
        </ContentCard>
    );
};

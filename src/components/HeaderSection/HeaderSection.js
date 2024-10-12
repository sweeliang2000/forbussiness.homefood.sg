import styles from './HeaderSection.module.css';
import { ContentCard } from "../ContentCard/ContentCard";
import { LoadingButton } from '@mui/lab';

export const HeaderSection = ({
    title,
    description,
    className
}) => {
    return (
        <ContentCard className={`${className} ${styles.informationCard}`}>
            <div className={styles.titleSection}>
                <h1 className={styles.title}>{title}</h1>

                <LoadingButton
                    size="small"
                    // onClick={handleClick}
                    // loading={true}
                    // disabled
                    loadingPosition="start"
                    variant="contained"
                    className={styles.loadingButton}
                >
                    Save
                </LoadingButton>

            </div>
            <div className={styles.description}>{description}</div>
        </ContentCard>
    );
};

import styles from './HeaderSection.module.css';
import { ContentCard } from '../ContentCard/ContentCard';
import { Button } from '@mui/material'
import Alert from '@mui/material/Alert';
import { FaCheck } from "react-icons/fa";
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';

export const HeaderSection = ({
    title,
    description,
    className,
    isSuccess,
    isError,
    setShowError,
    isDisabled,
    errorMessage,
    ...props
}) => {
    return (
        <ContentCard className={`${className} ${styles.informationCard}`}>
            <div className={styles.titleSection}>
                <h1 className={styles.title}>{title}</h1>

                <Button
                    type='submit'
                    size='small'
                    loadingPosition='start'
                    variant='contained'
                    className={`${styles.loadingButton} ${isSuccess ? styles.successfull : null}`}
                    disabled={isSuccess || isDisabled}
                    {...props}
                >
                    {isSuccess ? <FaCheck className={styles.checked} /> : null}
                    {isSuccess ? 'Saved' : 'Save'}
                </Button>

            </div>
            <div className={styles.description}>{description}</div>

            { isError && <Alert
                className={styles.alert}
                severity="error"
                action={
                    <IconButton
                        aria-label="close"
                        color="inherit"
                        size="small"
                        onClick={() => setShowError(false)}
                    >
                        <CloseIcon fontSize="inherit" />
                    </IconButton>
                }
            >
                {errorMessage}
            </Alert>}
        </ContentCard>
    );
};

import styles from './HeaderSection.module.css';
import { ContentCard } from '../ContentCard/ContentCard';
import { Button } from '@mui/material'
import Alert from '@mui/material/Alert';
import { FaCheck } from "react-icons/fa";
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import { useState } from 'react';

export const HeaderSection = ({
    title,
    description,
    className,
    isSuccess,
    isError,
    setShowError,
    isDisabled,
    errorMessage,
    successMessage,
    setShowSuccess,
    showButton = true,
    infoMessage,
    showCancelButton = false,
    onCancel,
    buttonText = 'Save',
    successButtonText = 'Saved',
    warningMessage,
    ...props
}) => {
    const [showSuccessAlert, setShowSuccessAlert] = useState(true);

    // Use the prop setShowSuccess if provided, otherwise use local state
    const handleSetShowSuccess = setShowSuccess || setShowSuccessAlert;
    const shouldShowSuccess = successMessage && successMessage !== '' && successMessage !== null && successMessage !== undefined && (setShowSuccess ? true : showSuccessAlert);

    return (
        <ContentCard className={`${className} ${styles.informationCard}`}>
            <div className={styles.titleSection}>
                <h1 className={styles.title}>{title}</h1>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {showCancelButton && (
                        <Button
                            size='small'
                            variant='outlined'
                            color='error'
                            onClick={onCancel}
                            style={{ textTransform: 'none' }}
                        >
                            Cancel Review
                        </Button>
                    )}
                    {showButton && (
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
                            {isSuccess ? successButtonText : buttonText}
                        </Button>
                    )}
                </div>
            </div>
            <div className={styles.description}>{description}</div>

            {warningMessage && (
                <Alert
                    className={styles.alert}
                    severity="warning"
                >
                    {warningMessage}
                </Alert>
            )}

            {infoMessage && (
                <Alert
                    className={styles.alert}
                    severity="info"
                >
                    {infoMessage}
                </Alert>
            )}

            {shouldShowSuccess && (
                <Alert
                    className={styles.alert}
                    severity="success"
                    action={
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => handleSetShowSuccess(false)}
                        >
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                >
                    {successMessage}
                </Alert>
            )}

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

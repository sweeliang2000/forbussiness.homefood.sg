'use client';
import styles from './DialogPopup.module.css';
import { Button, Dialog } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';

const DialogPopup = ({
    title,
    isOpen,
    setIsOpen,
    actionTitle,
    actionDisabled,
    onAction,
    children,
    onSubmit,
    deleteText,
    onDelete,
    onClose,
    ...props
}) => {
    const closeHandler = () => {
        // If custom onClose is provided, use it; otherwise use default behavior
        if (onClose) {
            const shouldClose = onClose();
            if (shouldClose !== false) {
                setIsOpen(false);
            }
        } else {
            setIsOpen(false);
        }
    }

    // Handle MUI Dialog's onClose (called on backdrop click, ESC key, etc.)
    const handleDialogClose = (event, reason) => {
        // If custom onClose is provided, use it; otherwise use default behavior
        if (onClose) {
            const shouldClose = onClose();
            if (shouldClose !== false) {
                setIsOpen(false);
            }
        } else {
            setIsOpen(false);
        }
    }

    return (
        <Dialog
            open={isOpen}
            onClose={handleDialogClose}
            fullWidth
            {...props}
        >
            <div className={styles.header}>
                <h1>{title}</h1>
                <IoCloseSharp className={styles.closeIcon} onClick={closeHandler} />
            </div>

            <form onSubmit={onSubmit}>
                {children}

                <div className={styles.footer}>
                    <div>
                        {
                            onDelete && (
                                <Button
                                    type='button'
                                    variant='text'
                                    color="error"
                                    className={styles.button}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onDelete();
                                    }}
                                >
                                    { deleteText === undefined ? 'Delete' : deleteText }
                                </Button>
                            )
                        }
                    </div>

                    <div className={styles.rightButtons}>
                        <Button
                            variant='contained'
                            className={`${styles.button} ${styles.cancel}`}
                            onClick={closeHandler}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            variant='contained'
                            className={styles.button}
                            disabled={actionDisabled}
                        >
                            {actionTitle === undefined ? 'Save' : actionTitle}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    )
};

export default DialogPopup;
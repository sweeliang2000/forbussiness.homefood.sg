'use client';
import styles from './DialogPopup.module.css';
import { Button, Dialog } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';

const DialogPopup = ({
    title,
    isOpen,
    setIsOpen,
    actionTitle,
    onAction,
    children,
    onSubmit,
    deleteText,
    onDelete,
    ...props
}) => {
    const closeHandler = () => {
        setIsOpen(false)
    }

    return (
        <Dialog
            open={isOpen}
            onClose={closeHandler}
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
                                    type='submit'
                                    variant='text'
                                    color="error"
                                    className={styles.button}
                                    onClick={onDelete}
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
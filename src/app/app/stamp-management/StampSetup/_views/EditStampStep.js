import FieldHeader from '@/components/FieldHeader/FieldHeader';
import styles from './EditStampStep.module.css';
import { Button, Dialog } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';

const EditStampStep = ({
    isOpen,
    setIsOpen,
    stampedIcon,
    setStampedIcon,
    unstampIcon,
    setUnstampedIcon,
    onSave
}) => {
    const closeHandler = () => {
        setIsOpen(false)
    }
    
    return (
        <Dialog
            open={isOpen}
            onClose={closeHandler}
            fullWidth
        >
            <div className={styles.header}>
                <h1>Modify stamp step 1</h1>
                <IoCloseSharp className={styles.closeIcon} onClick={closeHandler} />
            </div>

            <div className={styles.content}>
                <div className={styles.field}>
                    <FieldHeader
                        title='Stamped Icons'
                        type='h2'
                        hClassName={styles.title}
                    />

                    <DragDropImageUploader
                        images={stampedIcon}
                        setImages={setStampedIcon}
                        noOfImages={1}
                        width={80}
                        height={80}
                        imageClassName={styles.dragdropBannerImage}
                    />
                </div>

                <div className={styles.field}>
                    <FieldHeader
                        title='Unstamped Icons'
                        type='h2'
                        hClassName={styles.title}
                    />

                    <DragDropImageUploader
                        images={unstampIcon}
                        setImages={setUnstampedIcon}
                        noOfImages={1}
                        width={80}
                        height={80}
                        imageClassName={styles.dragdropBannerImage}
                    />
                </div>

                <div className={styles.field}>
                    <FieldHeader
                        title='Reward'
                        type='h2'
                        hClassName={styles.title}
                    />
                </div>
            </div>

            <div className={styles.footer}>
                <Button
                    variant='contained'
                    className={`${styles.button} ${styles.cancel}`}
                    onClick={closeHandler}
                >
                    Cancel
                </Button>
                <Button
                    variant='contained'
                    className={styles.button}
                    onClick={onSave}
                >
                    Save
                </Button>
            </div>
        </Dialog>
    )
};

export default EditStampStep
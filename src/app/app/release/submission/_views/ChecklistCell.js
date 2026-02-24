import { Button } from '@mui/material';
import Link from 'next/link';
import styles from './ChecklistCell.module.css';
import { FaCheck } from "react-icons/fa6";
import { MdClose } from "react-icons/md";

const ChecklistCell = ({
    title,
    description,
    isCompleted,
    editLink
}) => {
    // When the whole row is a link (editLink), don't wrap Edit in another Link to avoid nested <a>
    const EditButton = (
        <Button
            type={editLink ? 'button' : 'submit'}
            variant='contained'
            color='primary'
            className={styles.editButton}
            component={editLink ? 'span' : undefined}
        >
            Edit
        </Button>
    );

    const content = (
        <>
            {
                isCompleted ?
                    <div className={styles.checkedContainer}>
                        <FaCheck size={20} className={styles.checked} />
                    </div> :
                    <div className={styles.crossContainer}>
                        <MdClose size={24} className={styles.cross} />
                    </div>
            }

            <div className={styles.rightContainer}>
                <div className={styles.checklistItemContent}>
                    <h2 className={isCompleted ? styles.correct : styles.error}>{title}</h2>
                    <p>
                        {description}
                    </p>
                </div>

                {!isCompleted && <div>
                    {EditButton}
                </div>}
            </div>
        </>
    );

    // If editLink is provided, make the entire item clickable
    if (editLink) {
        return (
            <Link href={editLink} className={styles.checklistItemLink}>
                <div className={styles.checklistItem}>
                    {content}
                </div>
            </Link>
        );
    }

    return (
        <div className={styles.checklistItem}>
            {content}
        </div>
    );
};

export default ChecklistCell
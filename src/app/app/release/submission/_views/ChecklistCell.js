import { Button } from '@mui/material';
import Link from 'next/link';
import styles from './ChecklistCell.module.css';
import { FaCheck } from 'react-icons/fa6';
import { FiChevronRight } from 'react-icons/fi';

/**
 * One row of the release checklist.
 *
 * An unfinished item is *status*, not an error — it was previously
 * rendered with a red cross and a red title, which reads as "something
 * broke" rather than "you haven't got to this yet". Completed items go
 * green; everything else stays neutral and simply isn't ticked.
 */
const ChecklistCell = ({
    title,
    description,
    isCompleted,
    editLink
}) => {
    // When the whole row is a link, the Edit control must not be another
    // anchor — nested <a> is invalid and breaks keyboard navigation.
    const EditButton = (
        <Button
            type={editLink ? 'button' : 'submit'}
            variant='outlined'
            color='primary'
            size='small'
            className={styles.editButton}
            component={editLink ? 'span' : undefined}
        >
            Edit
        </Button>
    );

    const content = (
        <>
            <div className={isCompleted ? styles.checkedContainer : styles.pendingContainer}>
                {isCompleted
                    ? <FaCheck size={15} className={styles.checked} />
                    : <span className={styles.pendingDot} />}
            </div>

            <div className={styles.rightContainer}>
                <div className={styles.checklistItemContent}>
                    <h3 className={styles.itemTitle}>{title}</h3>
                    <p className={styles.itemDescription}>{description}</p>
                </div>

                {!isCompleted && !editLink && <div>{EditButton}</div>}
            </div>

            {editLink && (
                <FiChevronRight className={styles.chevron} aria-hidden='true' />
            )}
        </>
    );

    if (editLink) {
        return (
            <Link href={editLink} className={styles.checklistItemLink}>
                <div className={`${styles.checklistItem} ${styles.interactive}`}>
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

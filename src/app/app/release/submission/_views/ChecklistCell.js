import { Button } from '@mui/material';
import styles from './ChecklistCell.module.css';
import { FaCheck } from "react-icons/fa6";
import { MdClose } from "react-icons/md";

const ChecklistCell = ({
    title,
    description,
    isCompleted
}) => {
    return (

        <div className={styles.checklistItem}>
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
                    <Button
                        type='submit'
                        variant='contained'
                        color='primary'
                        // onClick={loginNowHandler}
                        className={styles.editButton}
                    >
                        Edit
                    </Button>
                </div>}
            </div>

        </div>
    )
};

export default ChecklistCell
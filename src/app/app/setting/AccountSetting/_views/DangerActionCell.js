import { Button } from '@mui/material';
import styles from './DangerActionCell.module.css';

const DangerActionCell = ({
    title,
    description,
    buttonTitle,
    onClick,
    last
}) => (
    <div className={`${styles.cell} ${last ? '' : styles.underline }`}>
        <div className={styles.left}>
            <h2 className={styles.title}>{title}</h2>
            <p>{description}</p>
        </div>

        <div>
            <Button
                variant='contained'
                className={styles.button}
                onClick={onClick}
            >
                {buttonTitle}
            </Button>
        </div>
    </div>
);

export default DangerActionCell;
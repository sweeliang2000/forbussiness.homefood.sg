import { LoadingButton } from '@mui/lab';
import styles from './GeneralActionCell.module.css';

const GeneralActionCell = ({
    title,
    description,
    buttonTitle,
    onClick,
    last,
    loading = false,
    type = 'primary' // 'primary' or 'danger'
}) => (
    <div className={`${styles.cell} ${last ? '' : styles.underline }`}>
        <div className={styles.left}>
            <h2 className={styles.title}>{title}</h2>
            {description && (
                <p className={styles.description}>{description}</p>
            )}
        </div>

        <div>
            <LoadingButton
                variant='contained'
                className={`${styles.button} ${type === 'danger' ? styles.dangerButton : styles.primaryButton}`}
                onClick={onClick}
                loading={loading}
            >
                {buttonTitle}
            </LoadingButton>
        </div>
    </div>
);

export default GeneralActionCell;
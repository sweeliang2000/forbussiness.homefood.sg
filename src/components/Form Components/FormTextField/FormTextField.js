import { TextField } from '@mui/material';
import styles from './FormTextField.module.css';

const FormTextField = ({
    title,
    subtitle,
    ...props
}) => {
    return (
        <div className={styles.formTextField}>
            { title && <h3 className={subtitle == undefined ? styles.titleBottom : undefined}>{title}</h3> }
            { subtitle && <p className={styles.description}>{subtitle}</p> }

            <TextField
                variant="outlined"
                fullWidth
                {...props}
            />
        </div>
    )
};

export default FormTextField;
import styles from './ExclamationTitle.module.css';
import ExclamationButton from '../ExclamationButton/ExclamationButton';

export const ExclamationTitle = ({
    title,
    description,
    url
}) => {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{title}</h1>
            <ExclamationButton
                description={description}
                url={url}
            />
        </div>
    )
};
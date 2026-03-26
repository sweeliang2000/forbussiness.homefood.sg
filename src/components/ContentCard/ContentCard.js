import styles from './ContentCard.module.css';

export const ContentCard = ({
    children,
    className,
    noMaxWidth = false,
}) => {
    return(
        <div className={`${styles.card} ${noMaxWidth ? styles.noMaxWidth : ''} ${className}`}>
            {children}
        </div>
    )
};
import styles from './ContentCard.module.css';

export const ContentCard = ({
    children,
    className
}) => {
    return(
        <div className={`${styles.card} ${className}`}>
            {children}
        </div>
    )
};
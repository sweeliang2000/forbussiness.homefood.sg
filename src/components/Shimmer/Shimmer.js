import styles from './Shimmer.module.css';

export default function Shimmer({ 
    width = '100%', 
    height = '20px', 
    borderRadius = '4px',
    className = '',
    responsive = true,
    ...props 
}) {
    return (
        <div 
            className={`${styles.shimmer} ${responsive ? styles.responsive : ''} ${className}`}
            style={{
                width,
                height,
                borderRadius,
                ...props.style
            }}
            {...props}
        />
    );
}

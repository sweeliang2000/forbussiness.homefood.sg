import styles from './Abutton.module.css';

const Abutton = ({ 
    children, 
    href = "#", 
    variant = "primary", 
    size = "medium",
    className = "",
    onClick,
    ...props 
}) => {
    // Handle compound variant names (e.g., "outline-primary", "outline-thin")
    const variantClass = styles[variant] || styles.primary; // fallback to primary if variant doesn't exist
    const buttonClass = `${styles.button} ${variantClass} ${styles[size]} ${className}`.trim();

    return (
        <a 
            href={href} 
            className={buttonClass}
            onClick={onClick}
            {...props}
        >
            {children}
        </a>
    );
};

export default Abutton;

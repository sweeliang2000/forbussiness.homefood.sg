import styles from "./Badge.module.css";

const Badge = ({ children, variant = "blue" }) => {
    return (
        <span className={`${styles.badge} ${styles[variant]}`}>
            {children}
        </span>
    );
};

export default Badge;


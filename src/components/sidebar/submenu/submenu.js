import styles from './submenu.module.css';
import Link from 'next/link';
import { FaChevronDown } from "react-icons/fa6";

export const Submenu = ({
    title,
    submenus,
    isExpand,
    onClick,
    icon: Icon,
}) => {
    return (
        <li>
            <button className={styles.dropdownBtn} onClick={onClick}>
                {Icon && <Icon className={styles.icon} />}
                <span>{title}</span>
                <FaChevronDown className={`${styles.downicon} ${isExpand && styles.rotate}`}/>
            </button>
            <ul className={`${styles.submenu} ${isExpand && styles.show}`}>
                <div className={styles.submenuContainer}>
                    {submenus.map((submenu, index) => (
                        <li key={index}>
                            <Link 
                                href={submenu.href} 
                                className={styles.link}>
                                    {submenu.title}
                            </Link>
                        </li>
                    ))}
                </div>
            </ul>
        </li>
    );
}

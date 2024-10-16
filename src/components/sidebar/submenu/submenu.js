import styles from './submenu.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChevronDown } from "react-icons/fa6";

export const Submenu = ({
    title,
    submenus,
    isExpand,
    onClick,
    icon: Icon,
}) => {

    const pathSegments = usePathname();

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
                        <li key={index} className={pathSegments == submenu.href ? styles.active : ''}>
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

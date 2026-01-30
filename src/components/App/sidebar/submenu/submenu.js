import styles from './submenu.module.css';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FaChevronDown } from 'react-icons/fa6';

export const Submenu = ({
    title,
    submenus,
    isExpand,
    onClick,
    icon: Icon,
}) => {

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

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
                        <li key={index} className={fullPath === submenu.href ? styles.active : ''}>
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

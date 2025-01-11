import CollbineForBusiness from '@/components/CollbineForBusiness/CollbineForBusiness';
import styles from './MobileNavbar.module.css';
import { RiMenu2Fill } from 'react-icons/ri';
import { IoCloseSharp } from 'react-icons/io5';

const MobileNavbar = ({
    isMenuOpen,
    toggleMenu,
    className
}) => {
    return(
        <nav className={`${styles.nav} ${className}`}>
            <div className={styles.sideContainer}>
                { 
                    !isMenuOpen ? 
                    <RiMenu2Fill className={styles.menu} onClick={toggleMenu}/> :
                    <IoCloseSharp className={styles.menu} onClick={toggleMenu}/> 
                }
                <CollbineForBusiness/>
            </div>
        </nav>
    )
};

export default MobileNavbar;
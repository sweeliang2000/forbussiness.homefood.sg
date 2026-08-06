import Image from 'next/image';
import styles from './HomeFoodForBusiness.module.css';

const HomeFoodForBusiness = ({ sidebar = false }) => {
    return(
        <div className={`${styles.logoDiv} ${sidebar ? styles.sidebarLockup : ''}`}>
            <Image
                className={styles.mark}
                src="/logo.png"
                alt=""
                width={36}
                height={36}
                priority
            />
            <span className={styles.wordmark}>
                <span className={styles.brand}>HomeFood</span>
                <span className={styles.business}>For Business</span>
            </span>
        </div>
    );
};

export default HomeFoodForBusiness;

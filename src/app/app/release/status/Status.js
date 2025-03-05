import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';


const StatusView = () => {
    return (
        <form
            className={styles.form}
            onSubmit={() => { }}
        >
            <HeaderSection
                className={styles.header}
                title='Release Status'
                description={
                    <p>
                        View the status of your current submission. <Link href='/'>Find out more.</Link>
                    </p>
                }
            />

        </form>
    )
};

export default StatusView;
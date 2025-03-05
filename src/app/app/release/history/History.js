import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';


const HistoryView = () => {
    return (
        <form
            className={styles.form}
            onSubmit={() => { }}
        >
            <HeaderSection
                className={styles.header}
                title='Release History'
                description={
                    <p>
                        View the status of your past submissions. <Link href='/'>Find out more.</Link>
                    </p>
                }
            />

        </form>
    )
};

export default HistoryView;
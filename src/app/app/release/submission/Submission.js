import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';


const SubmissionView = () => {
    return (
        <form
            className={styles.form}
            onSubmit={() => { }}
        >
            <HeaderSection
                className={styles.header}
                title='Release Submission'
                description={
                    <p>
                        Ready to get your loyalty system out?
                        Submit your loyalty now and it takes 1 - 2 
                        working days to get approved. <Link href='/'>Find out more.</Link>
                    </p>
                }
            />

        </form>
    )
};

export default SubmissionView;
import styles from './page.module.css';
import Link from 'next/link';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { FaChevronRight } from 'react-icons/fa';

const HistoryView = () => {
    // Temporary data list
    const releaseHistory = [
        {
            id: 1,
            version: '1.2.0',
            date: '2024-01-15',
            update_information: 'Added new reward management features and improved user interface.'
        },
        {
            id: 2,
            version: '1.1.5',
            date: '2023-12-20',
            update_information: 'Fixed critical bugs in stamp collection system and enhanced performance.'
        },
        {
            id: 3,
            version: '1.1.0',
            date: '2023-11-10',
            update_information: 'Introduced subscription management and updated location tracking features.'
        },
        {
            id: 4,
            version: '1.0.5',
            date: '2023-10-05',
            update_information: 'Initial release with core functionality for stamp and rewards management.'
        }
    ];

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

            <ContentCard className={styles.content}>
                <div className={styles.historyHeader}>
                    <FieldHeader
                        title='Release History'
                        type='h3'
                    />
                </div>

                <div className={styles.historyList}>
                    {releaseHistory.map((release) => (
                        <Link 
                            key={release.id} 
                            href={`/app/release/history/${release.id}`}
                            className={styles.historyItem}
                        >
                            <div className={styles.historyItemContent}>
                                <div className={styles.versionInfo}>
                                    <span className={styles.version}>{release.version}</span>
                                    <span className={styles.date}>{release.date}</span>
                                </div>
                                <p className={styles.updateInfo}>{release.update_information}</p>
                            </div>
                            <FaChevronRight className={styles.chevron} />
                        </Link>
                    ))}
                </div>
            </ContentCard>

        </form>
    )
};

export default HistoryView;
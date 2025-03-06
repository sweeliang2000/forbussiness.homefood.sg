import styles from './LoadingPage.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';


const LoadingPage = () => {
    return(
       <>
         <ContentCard className={styles.headerShimmer}/>
         <ContentCard className={styles.bodyShimmer}/>
       </>
    )
};

export default LoadingPage;
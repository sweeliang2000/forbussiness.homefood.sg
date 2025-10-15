import styles from './RewardCard.module.css';
import Image from "next/image";
import { FaCheck } from "react-icons/fa6";

const RewardCard = ({
    reward,
    onClick,
    currentCheck,
    isSelectable, 
    disableTags
}) => (
    <div 
        key={reward.id} 
        className={`${styles.card} ${currentCheck && styles.selected}`}
        onClick={onClick}>
        {
            isSelectable && 
            <div className={`${styles.check} ${currentCheck && styles.selected}`}>
                { currentCheck && <FaCheck className={styles.tick}/> }
            </div>
        }

        <Image
            src={reward.image !== undefined ? reward.image.url : '/images/placeholder/reward_placeholder.png'}
            width={200}
            height={200}
            alt={reward.name}
            className={styles.image}
        />

        {!disableTags && (
            <>
                {(reward.isCheck || reward.isPublished) && (
                    <div className={styles.statusTags}>
                        {reward.isCheck && <span className={styles.tag}>Currently Selected</span>}
                        {reward.isPublished && <span className={styles.tag}>Live and In Use</span>}
                    </div>
                )}

                {(!reward.isCheck && !reward.isPublished) && (
                    <div className={styles.statusTags}>
                        <span className={`${styles.tag} ${styles.notUsedTag}`}>Not Used</span>
                    </div>
                )}
            </>
        )}

        <div className={styles.content}>
            <h3>{reward.name}</h3>
            <p>{reward.description}</p>
        </div>
    </div>
);

export default RewardCard;
import styles from './RewardCard.module.css';
import Image from "next/image";
import { FaCheck } from "react-icons/fa6";

const RewardCard = ({
    reward,
    onClick,
    isSelectable,
    isCheck,
    isPublished
}) => (
    <div 
        key={reward.id} 
        className={`${styles.card} ${isCheck && styles.selected}`}
        onClick={onClick}>
        {
            isSelectable && 
            <div className={`${styles.check} ${isCheck && styles.selected}`}>
                { isCheck && <FaCheck className={styles.tick}/> }
            </div>
        }

        <Image
            src={reward.image !== undefined ? reward.image.url : '/images/placeholder/reward_placeholder.png'}
            width={200}
            height={200}
            alt={reward.name}
            className={styles.image}
        />

        <div className={styles.statusTags}>
            {isCheck && <span className={styles.tag}>Currently Selected</span>}
            {isPublished && <span className={styles.tag}>Live and In Use</span>}
        </div>

        <div className={styles.content}>
            <h3>{reward.name}</h3>
            <p>{reward.description}</p>
        </div>
    </div>
);

export default RewardCard;
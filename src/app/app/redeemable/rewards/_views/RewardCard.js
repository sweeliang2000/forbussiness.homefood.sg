import styles from './RewardCard.module.css';
import Image from "next/image";

const RewardCard = ({
    reward,
    onClick
}) => (
    <div key={reward.id} className={styles.card} onClick={onClick}>
        <Image
            src={reward.image !== undefined ? reward.image.url : '/images/placeholder/reward_placeholder.png'}
            width={200}
            height={200}
            alt={reward.name}
            className={styles.image}
        />

        <div className={styles.content}>
            <h3>{reward.name}</h3>
            <p>{reward.description}</p>
        </div>
    </div>
);

export default RewardCard;
import styles from './RewardCard.module.css';
import Image from "next/image";

const RewardCard = ({
    reward
}) => (
    <div key={reward.id} className={styles.card}>
        <Image
            src={reward.image.url}
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
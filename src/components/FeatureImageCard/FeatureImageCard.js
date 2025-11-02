import Image from 'next/image';
import styles from './FeatureImageCard.module.css';

const FeatureImageCard = ({ image, title, description, imageWidth = 420, imageHeight = 320 }) => {
    return (
        <div className={styles.card}>
            <div className={styles.cardContent}>
                {image && (
                    <div className={styles.imageContainer}>
                        <Image
                            src={image}
                            alt={title || 'Feature image'}
                            width={imageWidth}
                            height={imageHeight}
                            className={styles.image}
                        />
                    </div>
                )}
                <div className={styles.textContent}>
                    {title && <h3 className={styles.title}>{title}</h3>}
                    {description && <p className={styles.description}>{description}</p>}
                </div>
            </div>
        </div>
    );
};

export default FeatureImageCard;


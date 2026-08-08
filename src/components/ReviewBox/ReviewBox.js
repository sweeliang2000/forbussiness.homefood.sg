'use client';
import { Button } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import styles from './ReviewBox.module.css';

/**
 * Five glyphs with the filled ones coloured, rather than two runs of repeated
 * text: assistive tech reads one label instead of five separate characters,
 * and the row keeps its width whatever the score.
 */
const StarRating = ({ count }) => {
  const score = Math.max(0, Math.min(5, Number(count) || 0));
  return (
    <span className={styles.stars} role="img" aria-label={`${score} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarRoundedIcon
          key={i}
          className={`${styles.star} ${i < score ? styles.starFilled : styles.starEmpty}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
};


const ReviewBox = ({ review, onReply }) => {
  return (
    <div className={styles.reviewBox}>
      <div className={styles.reviewHeader}>
        <StarRating count={review.stars} />
        {review.title ? <span className={styles.reviewTitle}>{review.title}</span> : null}
      </div>
      <div className={styles.reviewMeta}>
        {review.date} — {review.user}
      </div>
      {review.text ? <div className={styles.reviewText}>{review.text}</div> : null}
      {review.response && (
        <>
          <div className={styles.responseBox}>
            <p className={styles.responseHeader}>Your reply{review.responseDate ? ` - ${review.responseDate}` : ''}</p>
            <div>{review.response}</div>
          </div>
        </>
      )}

      {onReply ? (
        <div className={styles.actionButtons}>
          <Button className={styles.actionButton} variant="text" color="primary" onClick={() => onReply(review)}>
            {review.response ? 'Edit Reply' : 'Reply'}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default ReviewBox; 
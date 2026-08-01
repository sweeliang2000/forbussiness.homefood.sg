'use client';
import { Button } from '@mui/material';
import styles from './ReviewBox.module.css';

const StarRating = ({ count }) => (
  <span>
    <span style={{ color: '#000000' }}>
      {'★'.repeat(count)}
    </span>
    <span style={{ color: '#CCCCCC' }}>
      {'★'.repeat(5 - count)}
    </span>
  </span>
);


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
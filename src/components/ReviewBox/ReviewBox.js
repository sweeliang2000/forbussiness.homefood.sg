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


const ReviewBox = ({ review }) => {
  return (
    <div className={styles.reviewBox}>
      <div className={styles.reviewHeader}>
        <StarRating count={review.stars} />
        <span className={styles.reviewTitle}>{review.title}</span>
      </div>
      <div className={styles.reviewMeta}>
        {review.date} — {review.user}
      </div>
      <div className={styles.reviewText}>{review.text}</div>
      {review.response && (
        <>
          <div className={styles.responseBox}>
            <p className={styles.responseHeader}>Developer Response - {review.responseDate}</p>
            <div>{review.response}</div>
          </div>
        </>
      )}

      <div className={styles.actionButtons}>
        {review.response ? (
          <Button className={styles.actionButton} variant="text" color="primary">Edit Response</Button>
        ) : (
          <Button className={styles.actionButton} variant="text" color="primary">Reply</Button>
        )}
        <Button className={styles.actionButton} variant="text" color="primary">Report a Concern</Button>
      </div>
    </div>
  );
};

export default ReviewBox; 
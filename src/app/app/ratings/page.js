'use client';
import { useState } from 'react';
import ReviewBox from '../../../components/ReviewBox/ReviewBox';
import styles from './page.module.css';

const reviews = [
  {
    stars: 4,
    title: 'Study this App',
    date: 'May 2, 2025',
    user: 'Crazy as Weed',
    text: 'You will pass for sure!',
    response: '',
    responseDate: 'Apr 26, 2025',
  },
  {
    stars: 2,
    title: 'Honest Review',
    date: 'Apr 16, 2025',
    user: 'userihlang',
    text: 'A good app you can use to practice your theory tests however if you wish to not purchase their subscriptions you will encounter ads every two/three questions you have answer.',
    response: 'Thank you for your feedback! Were glad you find the app helpful for practicing your theory tests. To enjoy an ad-free experience, you can purchase our Ad Remover option within the app. Your support helps us continue improving!',
    responseDate: 'Apr 26, 2025',
  },
  {
    stars: 1,
    title: 'To much ads',
    date: 'Mar 16, 2025',
    user: 'JWN093',
    text: 'To do 3 question test, view 30 scds advs , omg. Too waste time',
    response: 'Thank you for your feedback. We understand ads can be disruptive — you can remove them by purchasing the Ad Remover option in the app for a smoother experience. We appreciate your support!',
    responseDate: 'Apr 26, 2025',
  },
  {
    stars: 1,
    title: "Lot's of questions are wrong.",
    date: 'Mar 9, 2025',
    user: 'Lalalalawa@@@',
    text: 'I don\'t why. It\'s not a hard work,Why so many wrong questions?',
    response: 'Thank you for your feedback. We\'re sorry for any confusion caused. We are continuously working to review and update our questions to ensure accuracy. If you spot any specific errors, please feel free to report them through the app — it really helps us improve!',
    responseDate: 'Apr 26, 2025',
  },
];

const RatingsPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Reviews</h1>
      <div className={styles.reviewsGrid}>
        {reviews.map((review, idx) => (
          <ReviewBox key={idx} review={review} />
        ))}
      </div>
    </div>
  );
};

export default RatingsPage;
import { Skeleton } from '@mui/material';

import styles from './AuthShell.module.css';

/**
 * Suspense fallback for the auth pages.
 *
 * They previously fell back to a bare `<div>Loading...</div>`, which rendered
 * as unstyled text in the top-left corner and then jumped to a centred card.
 * Matching the card's shape means the layout does not move when the real form
 * arrives.
 */
const AuthCardSkeleton = () => (
  <main className={styles.shell}>
    <section className={styles.brandPanel} aria-hidden="true" />
    <section className={styles.formPanel}>
      <div className={styles.card} aria-hidden="true">
        <Skeleton variant="text" width="45%" height={40} />
        <Skeleton variant="text" width="75%" />
        <Skeleton variant="rounded" height={56} sx={{ mt: 3.5 }} />
        <Skeleton variant="rounded" height={56} sx={{ mt: 2.25 }} />
        <Skeleton variant="rounded" height={48} sx={{ mt: 3 }} />
      </div>
    </section>
  </main>
);

export default AuthCardSkeleton;

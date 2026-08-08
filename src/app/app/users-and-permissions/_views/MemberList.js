'use client';
import styles from './MemberList.module.css';
import Shimmer from '@/components/Shimmer/Shimmer';

/*
  Small presentational pieces shared by the invited-users and
  team-members lists.
*/

const ROLE_CLASS = {
    owner: styles.roleOwner,
    manager: styles.roleManager,
    operator: styles.roleOperator,
    viewer: styles.roleOperator
};

const STATUS_CLASS = {
    pending: styles.statusPending,
    accepted: styles.statusAccepted,
    rejected: styles.statusRejected
};

const titleCase = (value) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';

export const RolePill = ({ role }) => {
    const key = String(role || '').toLowerCase();
    return (
        <span className={`${styles.pill} ${ROLE_CLASS[key] || styles.roleOperator}`}>
            {titleCase(role) || 'Operator'}
        </span>
    );
};

export const StatusPill = ({ status }) => {
    const key = String(status || '').toLowerCase();
    return (
        <span className={`${styles.pill} ${STATUS_CLASS[key] || styles.statusPending}`}>
            {/* The dot is decoration; the word is what actually carries
                the state for anyone who can't rely on the hue. */}
            <span className={styles.statusDot} aria-hidden="true" />
            {titleCase(status) || 'Pending'}
        </span>
    );
};

export const Identity = ({ email, isYou = false }) => (
    <span className={styles.identity}>
        <span className={styles.monogram} aria-hidden="true">
            {(email || '?').trim().charAt(0).toUpperCase()}
        </span>
        <span className={styles.email}>
            {email}
            {isYou && <span className={styles.youTag}>You</span>}
        </span>
    </span>
);

export const ListCard = ({ title, count, children }) => (
    <section className={styles.card}>
        <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{title}</h2>
            {typeof count === 'number' && <span className={styles.count}>{count}</span>}
        </header>
        {children}
    </section>
);

export const EmptyState = ({ icon, title, children }) => (
    <div className={styles.empty}>
        {icon && <span className={styles.emptyIcon} aria-hidden="true">{icon}</span>}
        <p className={styles.emptyTitle}>{title}</p>
        {children && <p className={styles.emptyText}>{children}</p>}
    </div>
);

export const SkeletonRows = ({ rows = 3 }) => (
    <div aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
            <div key={index} className={styles.skeletonRow}>
                <Shimmer width="30px" height="30px" borderRadius="999px" responsive={false} />
                {/* `responsive` forces width:100%, which would flatten the
                    varied row lengths that make this read as a list. */}
                <Shimmer width={`${260 - index * 40}px`} height="14px" responsive={false} />
            </div>
        ))}
    </div>
);

export default styles;

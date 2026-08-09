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

/*
  A user-agent string is unreadable in a list. Reduced to "browser on OS",
  which is the only thing anyone is actually scanning for — "was that my
  laptop, or something I don't recognise?"

  Order matters: Edge and Opera both claim to be Chrome, and Chrome claims to
  be Safari, so the most specific test has to come first. This is deliberately
  approximate — a UA parser dependency would be a lot of weight for one label.
*/
export const describeDevice = (userAgent) => {
  if (!userAgent) return 'Unknown device';

  const ua = String(userAgent);
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera/.test(ua) ? 'Opera' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' :
    null;

  const os =
    /iPhone/.test(ua) ? 'iPhone' :
    /iPad/.test(ua) ? 'iPad' :
    /Android/.test(ua) ? 'Android' :
    /Mac OS X|Macintosh/.test(ua) ? 'macOS' :
    /Windows/.test(ua) ? 'Windows' :
    /Linux/.test(ua) ? 'Linux' :
    null;

  if (browser && os) return `${browser} on ${os}`;
  return browser || os || 'Unknown device';
};

export const isMobileDevice = (userAgent) =>
  /iPhone|iPad|Android|Mobile/i.test(userAgent || '');

/** "2 minutes ago" reads faster than a timestamp for recent activity. */
export const describeLastSeen = (iso) => {
  const then = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(then)) return 'Unknown';

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 90) return 'Active now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

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

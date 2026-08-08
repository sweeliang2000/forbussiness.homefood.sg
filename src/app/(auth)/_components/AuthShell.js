import styles from './AuthShell.module.css';

/**
 * The split-screen frame every auth page sits in.
 *
 * Login, signup and forgot-password each rebuilt this layout with their own
 * near-identical CSS module — around 285 duplicated lines, with the media
 * queries repeated twice inside two of them. One shell instead.
 *
 * @param {string} title     the page's h1
 * @param {string} subtitle  one line under it
 * @param {node}   children  the form
 * @param {node}   footer    the "don't have an account?" line, optional
 */
const AuthShell = ({ title, subtitle, children, footer }) => {
  return (
    <main className={styles.shell}>
      {/*
        Hidden below 800px rather than stacked. On a phone the person is here
        to sign in, and a full-height marketing panel above the form is just
        something to scroll past.
      */}
      <section className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brandInner}>
          <p className={styles.brandEyebrow}>HomeFood for Business</p>
          <p className={styles.brandTagline}>
            Get discovered, take orders, and get paid — from your own kitchen.
          </p>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header className={styles.cardHead}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </header>

          {children}

          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </div>
      </section>
    </main>
  );
};

export default AuthShell;

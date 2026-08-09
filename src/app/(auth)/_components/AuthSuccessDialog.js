'use client';

import { Button, Dialog, Fade } from '@mui/material';

import styles from './AuthSuccessDialog.module.css';

/**
 * The "that worked" moment at the end of a reset or a verification.
 *
 * forgot-password and verify each hand-rolled this with their own Dialog,
 * their own react-icons glyph and their own hardcoded colours (#059212 in one,
 * a black button in the other).
 *
 * Someone sees this once per account, which is the one tier where a little
 * delight is affordable — the mark draws itself rather than appearing. Every
 * frequently-seen surface in this app stays still by comparison.
 */

/**
 * Hand-drawn rather than MUI's CheckCircleRounded: a stock glyph can only fade
 * or scale as one lump, and the moment worth showing is the tick being *made*.
 * Ring pops, halo breathes outward, tick strokes on behind it.
 */
const SuccessMark = () => (
  <svg
    className={styles.mark}
    viewBox="0 0 72 72"
    width="72"
    height="72"
    aria-hidden="true"
    focusable="false"
  >
    <circle className={styles.halo} cx="36" cy="36" r="27" />
    <circle className={styles.disc} cx="36" cy="36" r="27" />
    <path
      className={styles.check}
      d="M24.5 36.5 L32.5 44.5 L47.5 28.5"
      fill="none"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AuthSuccessDialog = ({ open, title, message, actionLabel, onAction }) => (
  <Dialog
    open={open}
    aria-labelledby="auth-success-title"
    aria-describedby="auth-success-message"
    // No onClose: the only way out is the action. Dismissing by backdrop click
    // would leave someone on a spent form with no idea it had succeeded.
    disableEscapeKeyDown
    // Fade rather than MUI's default Grow, which starts at scale(0.75) — far
    // enough from rest to read as a zoom. The paper's own scale lives in CSS,
    // where it can use the same easing tokens as the rest of the app.
    slots={{ transition: Fade }}
    slotProps={{
      transition: { timeout: { enter: 260, exit: 180 } },
      paper: { className: styles.paper },
    }}
  >
    <div className={styles.container}>
      <SuccessMark />
      <h2 id="auth-success-title" className={styles.title}>{title}</h2>
      <p id="auth-success-message" className={styles.message}>{message}</p>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        onClick={onAction}
        className={styles.action}
        autoFocus
      >
        {actionLabel}
      </Button>
    </div>
  </Dialog>
);

export default AuthSuccessDialog;

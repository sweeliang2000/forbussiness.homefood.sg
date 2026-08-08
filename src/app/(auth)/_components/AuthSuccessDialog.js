'use client';

import { Button, Dialog } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import styles from './AuthSuccessDialog.module.css';

/**
 * The "that worked" moment at the end of a reset or a verification.
 *
 * forgot-password and verify each hand-rolled this with their own Dialog,
 * their own react-icons glyph and their own hardcoded colours (#059212 in one,
 * a black button in the other).
 */
const AuthSuccessDialog = ({ open, title, message, actionLabel, onAction }) => (
  <Dialog
    open={open}
    aria-labelledby="auth-success-title"
    // No onClose: the only way out is the action. Dismissing by backdrop click
    // would leave someone on a spent form with no idea it had succeeded.
    disableEscapeKeyDown
  >
    <div className={styles.container}>
      <CheckCircleRoundedIcon className={styles.glyph} aria-hidden="true" />
      <h2 id="auth-success-title" className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        onClick={onAction}
        autoFocus
      >
        {actionLabel}
      </Button>
    </div>
  </Dialog>
);

export default AuthSuccessDialog;

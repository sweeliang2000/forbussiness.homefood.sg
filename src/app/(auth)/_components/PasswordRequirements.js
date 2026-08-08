'use client';

import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';

import { checkPassword } from '@/utility/passwordPolicy';
import styles from './PasswordRequirements.module.css';

/**
 * Live checklist of the password rules.
 *
 * The rules were previously invisible: the server rejected a weak password
 * after submit and named only the first class it was missing, so people
 * guessed. Showing them up front turns a rejection into a checklist.
 *
 * Rendered only once the user starts typing — an untouched signup form should
 * not open with five red crosses.
 */
const PasswordRequirements = ({ value = '', id }) => {
  if (!value) return null;

  const { results } = checkPassword(value);

  return (
    <ul className={styles.list} id={id} aria-live="polite">
      {results.map((rule) => (
        <li
          key={rule.id}
          className={`${styles.rule} ${rule.met ? styles.met : ''}`}
        >
          {rule.met ? (
            <CheckRoundedIcon className={styles.glyph} aria-hidden="true" />
          ) : (
            <CircleRoundedIcon className={styles.dot} aria-hidden="true" />
          )}
          {/* The icon is decorative; the met/unmet state is announced here so a
              screen reader does not have to infer it from a tick. */}
          <span>{rule.label}</span>
          <span className={styles.srOnly}>{rule.met ? ' — met' : ' — not met yet'}</span>
        </li>
      ))}
    </ul>
  );
};

export default PasswordRequirements;

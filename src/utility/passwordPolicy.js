/**
 * The password rules, in one place, so the UI can show what the server will
 * actually enforce.
 *
 * Until now the two disagreed. The server checked four character classes in
 * `signUp` only (Authentication.js:401) and told you which one you missed
 * *after* you submitted; the client checked length >= 8 and nothing else; and
 * `confirmForgotPassword` checked nothing at all, so a password reset could set
 * a password that signup would have rejected.
 */

/** Byte-identical to the server pattern at Authentication.js:401. */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Each rule as its own predicate, so the UI can tick them off individually
 * instead of showing one all-or-nothing error.
 */
export const PASSWORD_RULES = [
  { id: 'length', label: `At least ${MIN_PASSWORD_LENGTH} characters`, test: (v) => v.length >= MIN_PASSWORD_LENGTH },
  { id: 'lower', label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'upper', label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'digit', label: 'A number', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'A symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/**
 * @returns {{ valid: boolean, results: Array<{id, label, met: boolean}> }}
 */
export function checkPassword(value = '') {
  const results = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(value),
  }));

  return { valid: results.every((r) => r.met), results };
}

/** Single-sentence version, for a server response or a summary error. */
export const PASSWORD_REQUIREMENTS_MESSAGE =
  `Password must be at least ${MIN_PASSWORD_LENGTH} characters and include an uppercase letter, ` +
  'a lowercase letter, a number, and a symbol.';

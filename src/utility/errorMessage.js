/**
 * Turn an axios failure into the string we show the user.
 *
 * This exact four-line shape was copy-pasted into six catch blocks across the
 * auth pages. Same logic, same fallback chain, same "(Error code: X)" suffix —
 * so a fix to any of them fixed only that one.
 *
 * The server's error envelope is { error: { message, statusCode } } (see
 * createErrorResponse in src/lib/server/errors.js); the other branches cover
 * older shapes and network failures where there is no response at all.
 */
export function errorMessageFrom(error, fallback = 'An unknown error occurred') {
  const data = error?.response?.data;

  const message =
    data?.error?.message ||
    data?.message ||
    error?.message ||
    fallback;

  const code =
    data?.error?.statusCode ||
    data?.code ||
    error?.code ||
    'UNKNOWN';

  return `${message} (Error code: ${code})`;
}

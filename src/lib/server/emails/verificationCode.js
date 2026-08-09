/*
  The verification-code email — the one Cognito sends on signup, on "resend
  code", and on a password reset.

  Unlike invite.js this module never reaches SES. Cognito owns the code, never
  hands it to us, and sends the message itself, so the only way to style it is
  to hand Cognito the markup up front: the pool's VerificationMessageTemplate
  holds this HTML with a `{####}` placeholder that Cognito substitutes at send
  time. `scripts/apply-cognito-email-template.mjs` is what uploads it.

  Three consequences of that arrangement, all of which shape the file:

  1. One template serves all three flows. Cognito reads the same
     VerificationMessageTemplate for sign-up, resend and forgot-password, so the
     copy has to be true of a password reset as well as a new account. Per-flow
     wording needs a CustomMessage Lambda trigger, which is a deployment, not a
     config change.

  2. `{####}` appears exactly once. Cognito documents one placeholder; a second
     occurrence is not worth the risk of an unsubstituted literal reaching an
     inbox, which is why the code is not repeated in the preheader.

  3. No plaintext part. Cognito sends a single HTML body, so the `text` field
     returned here exists for parity with invite.js and for tests — nothing
     sends it today.

  Tables and inline styles for the same reason as invite.js: Outlook renders
  through Word's engine and Gmail strips <style> blocks in some contexts.

  The palette is repeated from invite.js rather than shared. Two constants
  blocks are cheaper than a shared module that both a `server-only` file and a
  plain node script have to be able to import.
*/

/** Cognito's substitution token. Replaced with the six-digit code at send time. */
export const CODE_PLACEHOLDER = '{####}';

/** Cognito rejects a verification message longer than this. */
export const COGNITO_EMAIL_MESSAGE_MAX = 20000;

const BRAND = '#E4550D';
const INK = '#1a1a1a';
const MUTED = '#5c5c66';
const FAINT = '#8a8a94';
const HAIRLINE = '#ebebf0';

/**
 * @param {object} [options]
 * @param {string} [options.code] what to render in the code box. Defaults to
 *   Cognito's placeholder; pass a literal like '123456' to preview the email.
 */
export function buildVerificationCodeEmail({ code = CODE_PLACEHOLDER } = {}) {
  const subject = 'Your HomeFood for Business verification code';

  // Inbox preview line. Without one, clients scrape the first visible text,
  // which is the wordmark — every message previews identically.
  const preheader = 'Enter this code to confirm your email address.';

  const text = [
    `Your HomeFood for Business verification code:`,
    ``,
    code,
    ``,
    `Enter it on the page you started on to confirm it's you.`,
    ``,
    `----`,
    `The code is single-use. If it has expired, request a new one.`,
    `If you didn't request a code you can ignore this email — nothing changes until a code is entered.`
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f7;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;visibility:hidden;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f2f7;">
    <tr><td align="center" style="padding:32px 12px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:544px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

        <tr><td style="padding:0 4px 14px 4px;">
          <span style="font-size:16px;font-weight:700;letter-spacing:-0.01em;color:${BRAND};">HomeFood</span><span style="font-size:13px;font-weight:600;color:${FAINT};">&nbsp;&nbsp;for Business</span>
        </td></tr>

        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid ${HAIRLINE};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

            <tr><td style="height:4px;background:${BRAND};border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

            <tr><td style="padding:30px 32px 0 32px;">
              <h1 style="margin:0 0 10px 0;font-size:23px;line-height:1.24;letter-spacing:-0.015em;color:${INK};font-weight:700;">Your verification code</h1>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.55;color:${MUTED};">
                Enter this code on the page you started on to confirm it's you.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px 0;">
                <tr><td align="center" style="background:#f9f9fb;border:1px solid ${HAIRLINE};border-radius:12px;padding:22px 16px;">
                  <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${FAINT};">Verification code</p>
                  <p style="margin:0;font-size:34px;line-height:1.1;font-weight:700;letter-spacing:0.22em;text-indent:0.22em;color:${INK};">${code}</p>
                </td></tr>
              </table>

              <p style="margin:0 0 26px 0;font-size:14px;line-height:20px;color:${MUTED};">
                The code is single-use. If it has expired, request a new one from the same page.
              </p>
            </td></tr>

            <tr><td style="padding:0 32px 26px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.55;color:${FAINT};">
                Never share this code. HomeFood will never ask you for it by phone, chat or email.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding:18px 8px 0 8px;">
          <p style="margin:0 0 7px 0;font-size:12px;line-height:1.55;color:${FAINT};">
            HomeFood for Business helps home-based food businesses in Singapore take orders, manage a menu and get paid.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.55;color:${FAINT};">
            If you didn't request this code you can ignore this email — nothing changes until a code is entered.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

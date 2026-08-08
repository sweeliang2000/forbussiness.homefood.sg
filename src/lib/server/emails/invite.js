import 'server-only';

import { FRONTEND_BASE_URL, SES_FROM_EMAIL, SES_FROM_NAME } from '../env';

/*
  The team-invitation email.

  Replaces a message whose entire subject and body was the string "Create An
  Account" — no link, no context, no sender identity.

  Built with tables and inline styles rather than modern CSS on purpose:
  Outlook renders through Word's engine, Gmail strips <style> blocks in some
  contexts, and flexbox/grid are unsupported across most of the field. This is
  the layout that survives.
*/

/** Guards against a stray quote or bracket in an address or role. */
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * RFC 5322 From with a display name — a bare address shows in most clients as
 * just the mailbox, which reads like machine output.
 */
export const fromHeader = () => `${SES_FROM_NAME} <${SES_FROM_EMAIL}>`;

const BRAND = '#E4550D';
const BRAND_DARK = '#9A340B';
const INK = '#1a1a1a';
const MUTED = '#5c5c66';
const FAINT = '#8a8a94';
const HAIRLINE = '#ebebf0';

/*
  Where the invitation is actually accepted.

  An invitee doesn't accept from the email — they accept from the banner on
  the Users & permissions page, once signed in. `/login` honours a `redirect`
  query param, so an existing user lands directly on the banner. Signup has no
  such param and routes through email verification back to /login, so new
  users get the plain signup URL plus the accept link for afterwards.
*/
const ACCEPT_PATH = '/app/users-and-permissions';
const acceptUrl = () =>
  `${FRONTEND_BASE_URL}/login?redirect=${encodeURIComponent(ACCEPT_PATH)}`;
const signupUrl = () => `${FRONTEND_BASE_URL}/signup`;

/**
 * @param {object} options
 * @param {string} options.invitedBy   who sent the invitation
 * @param {string} options.role        the role being granted
 * @param {boolean} options.userExists whether they already have an account
 * @param {boolean} options.isReminder true for a resend
 */
export function buildInviteEmail({ invitedBy, role, userExists, isReminder = false }) {
  const roleLabel = role || 'Operator';
  const inviter = invitedBy || 'Someone';

  const primaryUrl = userExists ? acceptUrl() : signupUrl();
  const primaryLabel = userExists ? 'Accept invitation' : 'Create your account';

  const subject = isReminder
    ? 'Reminder: your invitation to HomeFood for Business'
    : `${inviter} invited you to their shop on HomeFood`;

  // Inbox preview line. Without one, clients scrape the first visible text,
  // which is the wordmark — every message previews identically.
  const preheader = userExists
    ? `Sign in to accept and start working in their shop as ${roleLabel}.`
    : `Create your HomeFood account to accept the invitation as ${roleLabel}.`;

  const steps = userExists
    ? [`Accept the invitation from the banner on your Users &amp; permissions page.`]
    : [
        `Create your account and confirm your email address.`,
        `Sign in, then accept the invitation from the banner on your Users &amp; permissions page.`
      ];

  const textSteps = userExists
    ? [`Accept the invitation from the banner on your Users & permissions page.`]
    : [
        `1. Create your account and confirm your email address.`,
        `2. Sign in, then accept the invitation from the banner on your Users & permissions page.`
      ];

  const text = [
    `${inviter} has invited you to help run their shop on HomeFood for Business.`,
    ``,
    `Your role: ${roleLabel}`,
    ``,
    ...textSteps,
    ``,
    `${primaryLabel}: ${primaryUrl}`,
    ...(userExists ? [] : ['', `Once your account exists, accept here: ${acceptUrl()}`]),
    ``,
    `----`,
    `HomeFood for Business helps home-based food businesses in Singapore take orders, manage a menu and get paid.`,
    `If you weren't expecting this invitation you can ignore this email — nothing happens until you accept.`
  ].join('\n');

  // A numbered badge on a list of one reads as a truncated list, so the
  // single-step case is just a sentence.
  const numbered = steps.length > 1;
  const stepsHtml = steps
    .map((step, i) => {
      const gap = i === steps.length - 1 ? '0' : '10px';
      const marker = numbered
        ? `<td width="26" valign="top" style="padding:0 0 ${gap} 0;">
                <div style="width:20px;height:20px;border-radius:10px;background:#fdece1;color:${BRAND_DARK};font-size:11px;font-weight:700;text-align:center;line-height:20px;">${i + 1}</div>
              </td>`
        : '';
      return `
            <tr>
              ${marker}<td valign="top" style="padding:0 0 ${gap} 0;font-size:14px;line-height:20px;color:${MUTED};">${step}</td>
            </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f7;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;visibility:hidden;">${escapeHtml(preheader)}</div>
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
              <h1 style="margin:0 0 10px 0;font-size:23px;line-height:1.24;letter-spacing:-0.015em;color:${INK};font-weight:700;">You've been invited</h1>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.55;color:${MUTED};">
                <strong style="color:${INK};font-weight:600;">${escapeHtml(inviter)}</strong> has invited you to help run their shop on HomeFood for Business.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;">
                <tr><td style="background:#f9f9fb;border:1px solid ${HAIRLINE};border-radius:12px;padding:14px 16px;">
                  <p style="margin:0 0 3px 0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${FAINT};">Your role</p>
                  <p style="margin:0;font-size:16px;font-weight:600;color:${INK};">${escapeHtml(roleLabel)}</p>
                </td></tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${FAINT};">How to accept</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 26px 0;">${stepsHtml}
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="background:${BRAND};border-radius:10px;">
                  <a href="${primaryUrl}" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.005em;">${primaryLabel}</a>
                </td></tr>
              </table>
            </td></tr>

            <tr><td style="padding:22px 32px 26px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.55;color:${FAINT};word-break:break-all;">
                Button not working? Paste this into your browser:<br>
                <a href="${primaryUrl}" style="color:${BRAND_DARK};text-decoration:underline;">${primaryUrl}</a>
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding:18px 8px 0 8px;">
          <p style="margin:0 0 7px 0;font-size:12px;line-height:1.55;color:${FAINT};">
            HomeFood for Business helps home-based food businesses in Singapore take orders, manage a menu and get paid.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.55;color:${FAINT};">
            If you weren't expecting this invitation you can ignore this email — nothing happens until you accept.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/** SES SendEmail params for an invitation. */
export function inviteEmailParams({ to, invitedBy, role, userExists, isReminder = false }) {
  const { subject, html, text } = buildInviteEmail({ invitedBy, role, userExists, isReminder });

  return {
    Source: fromHeader(),
    Destination: { ToAddresses: [to] },
    // Replies reach the person who sent the invite rather than the no-reply void.
    ReplyToAddresses: invitedBy ? [invitedBy] : undefined,
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: { Data: text, Charset: 'UTF-8' }
      }
    }
  };
}

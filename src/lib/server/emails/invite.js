import 'server-only';

import { FRONTEND_BASE_URL, SES_FROM_EMAIL, SES_FROM_NAME } from '../env';

/*
  The team-invitation email.

  This replaces a message whose entire subject and body was the string
  "Create An Account" — no link, no context, no sender identity. Between
  that and a From domain that failed DMARC, it was close to unfilterable
  from actual phishing.

  Kept as plain template strings rather than a rendering dependency: it's
  two emails, and an HTML string is easier to reason about than a layer
  that generates one.
*/

/** Belt-and-braces against a stray quote or angle bracket in a shop name. */
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * RFC 5322 From with a display name. A bare address shows up in most clients
 * as just the mailbox, which reads like machine output.
 */
export const fromHeader = () => `${SES_FROM_NAME} <${SES_FROM_EMAIL}>`;

const BRAND = '#E4550D';
const INK = '#1a1a1a';
const MUTED = '#5c5c66';

/**
 * @param {object} options
 * @param {string} options.invitedBy   email of the person who sent the invite
 * @param {string} options.role        role they've been granted
 * @param {boolean} options.userExists whether they already have an account —
 *   decides whether we send them to sign up or straight to log in
 * @param {boolean} options.isReminder true for a resend, so the subject says so
 */
export function buildInviteEmail({ invitedBy, role, userExists, isReminder = false }) {
  const action = userExists ? 'Log in to accept' : 'Create your account';
  const url = `${FRONTEND_BASE_URL}/${userExists ? 'login' : 'signup'}`;
  const roleLabel = role || 'Operator';

  const subject = isReminder
    ? `Reminder: your invitation to HomeFood for Business`
    : `${invitedBy} invited you to their shop on HomeFood`;

  const lead = userExists
    ? `You already have a HomeFood account, so just log in and the invitation will be waiting for you.`
    : `You'll need a HomeFood account to accept. It takes a minute to set up.`;

  const text = [
    `${invitedBy} has invited you to help run their shop on HomeFood for Business.`,
    ``,
    `Your role: ${roleLabel}`,
    ``,
    lead,
    ``,
    `${action}: ${url}`,
    ``,
    `---`,
    `HomeFood for Business lets home-based food businesses in Singapore take orders, manage a menu and get paid.`,
    `If you weren't expecting this invitation you can safely ignore this email — nothing happens until you accept.`
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f2f2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:28px 28px 0 28px;">
      <p style="margin:0 0 22px 0;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:${BRAND};">HomeFood<span style="color:${MUTED};font-weight:600;"> for Business</span></p>
      <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;letter-spacing:-0.014em;color:${INK};">You've been invited</h1>
      <p style="margin:0 0 18px 0;font-size:15px;line-height:1.5;color:${MUTED};">
        <strong style="color:${INK};">${escapeHtml(invitedBy)}</strong> has invited you to help run their shop on HomeFood for Business.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
        <tr><td style="background:#f7f7fa;border-radius:10px;padding:10px 14px;font-size:13px;color:${MUTED};">
          Your role &nbsp;<strong style="color:${INK};font-size:14px;">${escapeHtml(roleLabel)}</strong>
        </td></tr>
      </table>
      <p style="margin:0 0 22px 0;font-size:15px;line-height:1.5;color:${MUTED};">${escapeHtml(lead)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
        <tr><td style="background:${BRAND};border-radius:10px;">
          <a href="${url}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${action}</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:18px 28px 26px 28px;border-top:1px solid #ebebf0;">
      <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#8a8a94;">
        HomeFood for Business lets home-based food businesses in Singapore take orders, manage a menu and get paid.
      </p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a94;">
        If you weren't expecting this invitation you can safely ignore this email — nothing happens until you accept.
      </p>
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
    // Replies go to the person who actually sent the invite, not into the
    // no-reply void.
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

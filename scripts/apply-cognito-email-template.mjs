#!/usr/bin/env node

/*
  Brings the Cognito user pool's outbound email in line with the app: the
  branded verification-code template, and the SES identity it is sent from.

  Cognito generates the OTP and sends the message itself, so neither piece is
  reachable from application code — the pool config is the only lever. See
  src/lib/server/emails/verificationCode.js.

  Read-only by default. Pass --apply to write.

    npm run cognito:email-template
    AWS_PROFILE=<admin> npm run cognito:email-template -- --apply

  The sender is derived from SES_FROM_EMAIL / SES_FROM_NAME, the same variables
  invite.js sends under, so the two emails can't drift apart. The pool shipped
  pointing at a legacy collbine.com identity while everything else had already
  moved to homefood.sg, which is exactly the drift this closes.

  Four hazards this script exists to handle:

  1. UpdateUserPool is a *replace*, not a patch. Every field left out reverts to
     its default — omit AutoVerifiedAttributes and email auto-verification is
     silently switched off for the whole pool. So it reads the pool first and
     sends everything back.

  2. Cognito rejects EmailVerificationMessage / EmailVerificationSubject sent
     alongside VerificationMessageTemplate, even though DescribeUserPool
     returns both. The deprecated pair is dropped on the way through.

  3. Cognito can only send as an SES identity that grants it permission. A
     verified domain is not enough: the identity needs a sending-authorization
     policy naming cognito-idp.amazonaws.com, or UpdateUserPool fails. The
     script writes that policy before it repoints the pool.

  4. The app's APP_AWS_* keys belong to an IAM user scoped to
     AdminUserGlobalSignOut, so even the read comes back AccessDenied with them.
     Run with an admin profile; the credential block below falls through to the
     default provider chain when the app keys are absent.
*/

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
  UpdateUserPoolCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { SESClient, PutIdentityPolicyCommand } from '@aws-sdk/client-ses';

import {
  buildVerificationCodeEmail,
  CODE_PLACEHOLDER,
  COGNITO_EMAIL_MESSAGE_MAX
} from '../src/lib/server/emails/verificationCode.js';

const apply = process.argv.includes('--apply');

const poolId = process.env.COGNITO_USER_POOL_ID;
if (!poolId) {
  console.error('COGNITO_USER_POOL_ID is not set. Run via: npm run cognito:email-template');
  process.exit(1);
}

const region = process.env.APP_AWS_REGION || 'ap-southeast-1';

// Defaults mirror src/lib/server/env.js so a bare run still produces the
// correct sender when only an AWS profile is in the environment.
const fromEmail = process.env.SES_FROM_EMAIL || 'no-reply@homefood.sg';
const fromName = process.env.SES_FROM_NAME || 'HomeFood for Business';
const fromDomain = fromEmail.split('@')[1];

const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
const credentials =
  accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {};

const cognito = new CognitoIdentityProviderClient({ region, ...credentials });
const ses = new SESClient({ region, ...credentials });

/** Turns the scoped-credentials AccessDenied into the instruction that fixes it. */
const send = async (client, command, action) => {
  try {
    return await client.send(command);
  } catch (error) {
    if (error.name === 'AccessDeniedException' || error.name === 'NotAuthorizedException') {
      console.error(`\nNot authorised to ${action}.\n${error.message}`);
      console.error(
        '\nThe APP_AWS_* keys in .env are scoped to AdminUserGlobalSignOut only. Re-run with an admin profile:\n' +
          `  AWS_PROFILE=<admin> COGNITO_USER_POOL_ID=${poolId} APP_AWS_REGION=${region} \\\n` +
          `    node scripts/apply-cognito-email-template.mjs${apply ? ' --apply' : ''}`
      );
      process.exit(1);
    }
    throw error;
  }
};

// --- the template ------------------------------------------------------------

const { subject, html } = buildVerificationCodeEmail();

// Cognito documents a single placeholder. More than one risks a literal
// "{####}" landing in someone's inbox; none means the code never appears.
const placeholders = html.split(CODE_PLACEHOLDER).length - 1;
if (placeholders !== 1) {
  console.error(`Template must contain exactly one ${CODE_PLACEHOLDER}, found ${placeholders}.`);
  process.exit(1);
}
if (html.length > COGNITO_EMAIL_MESSAGE_MAX) {
  console.error(`Template is ${html.length} chars, over Cognito's ${COGNITO_EMAIL_MESSAGE_MAX} limit.`);
  process.exit(1);
}

const previewPath = join(tmpdir(), 'homefood-verification-email.html');
writeFileSync(previewPath, buildVerificationCodeEmail({ code: '123456' }).html);

// --- what the pool has now ---------------------------------------------------

const { UserPool: pool } = await send(
  cognito,
  new DescribeUserPoolCommand({ UserPoolId: poolId }),
  'read the user pool'
);

// Same account as the pool, parsed rather than looked up so the script needs no
// sts:GetCallerIdentity on top of everything else.
const accountId = pool.Arn.split(':')[4];
const identityArn = `arn:aws:ses:${region}:${accountId}:identity/${fromDomain}`;

const desiredEmailConfig = {
  ...pool.EmailConfiguration,
  EmailSendingAccount: 'DEVELOPER',
  SourceArn: identityArn,
  From: `${fromName} <${fromEmail}>`,
  ReplyToEmailAddress: fromEmail
};

const currentTemplate = pool.VerificationMessageTemplate?.EmailMessage || '';
const currentFrom = pool.EmailConfiguration?.From || '(Cognito default)';
const templateChanged = currentTemplate.trim() !== html.trim();
const senderChanged =
  currentFrom !== desiredEmailConfig.From ||
  pool.EmailConfiguration?.SourceArn !== identityArn ||
  pool.EmailConfiguration?.EmailSendingAccount !== 'DEVELOPER';

console.log(`Pool:      ${poolId} (${region})`);
console.log(`Preview:   ${previewPath}`);
console.log(`Template:  ${html.length} / ${COGNITO_EMAIL_MESSAGE_MAX} chars — ${templateChanged ? 'DIFFERS from pool' : 'already applied'}`);
console.log(`Subject:   ${subject}`);
console.log(`From:      ${currentFrom}`);
if (senderChanged) {
  console.log(`       ->  ${desiredEmailConfig.From}`);
  console.log(`Identity:  ${pool.EmailConfiguration?.SourceArn || '(none)'}`);
  console.log(`       ->  ${identityArn}`);
}

if (!templateChanged && !senderChanged) {
  console.log('\nPool is already in sync. Nothing to do.');
  process.exit(0);
}

if (!apply) {
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

// --- write -------------------------------------------------------------------

if (senderChanged) {
  // Verifying the domain in SES is not enough: without this, UpdateUserPool
  // rejects the SourceArn outright. Name matches the policy the console writes.
  await send(
    ses,
    new PutIdentityPolicyCommand({
      Identity: fromDomain,
      PolicyName: 'Cognito-SES-Policy',
      Policy: JSON.stringify({
        Version: '2008-10-17',
        Statement: [
          {
            Sid: 'AllowCognitoToSend',
            Effect: 'Allow',
            Principal: { Service: 'cognito-idp.amazonaws.com' },
            Action: ['ses:SendEmail', 'ses:SendRawEmail'],
            Resource: identityArn
          }
        ]
      })
    }),
    `grant Cognito permission to send as ${fromDomain}`
  );
  console.log(`\nGranted Cognito ses:SendEmail on ${fromDomain}.`);
}

// AdminCreateUserConfig.UnusedAccountValidityDays is the deprecated twin of
// Policies.PasswordPolicy.TemporaryPasswordValidityDays, and Cognito refuses an
// update carrying both.
const adminCreateUserConfig = pool.AdminCreateUserConfig ? { ...pool.AdminCreateUserConfig } : undefined;
if (adminCreateUserConfig && pool.Policies?.PasswordPolicy?.TemporaryPasswordValidityDays !== undefined) {
  delete adminCreateUserConfig.UnusedAccountValidityDays;
}

await send(
  cognito,
  new UpdateUserPoolCommand({
    UserPoolId: poolId,

    // Everything below is read back verbatim so the update doesn't reset it.
    Policies: pool.Policies,
    DeletionProtection: pool.DeletionProtection,
    LambdaConfig: pool.LambdaConfig,
    AutoVerifiedAttributes: pool.AutoVerifiedAttributes,
    SmsAuthenticationMessage: pool.SmsAuthenticationMessage,
    UserAttributeUpdateSettings: pool.UserAttributeUpdateSettings,
    MfaConfiguration: pool.MfaConfiguration,
    DeviceConfiguration: pool.DeviceConfiguration,
    SmsConfiguration: pool.SmsConfiguration,
    UserPoolTags: pool.UserPoolTags,
    AdminCreateUserConfig: adminCreateUserConfig,
    UserPoolAddOns: pool.UserPoolAddOns,
    AccountRecoverySetting: pool.AccountRecoverySetting,

    EmailConfiguration: desiredEmailConfig,
    VerificationMessageTemplate: {
      ...pool.VerificationMessageTemplate,
      DefaultEmailOption: 'CONFIRM_WITH_CODE',
      EmailSubject: subject,
      EmailMessage: html
    }
  }),
  'update the user pool'
);

console.log('Applied. Sign up with a throwaway address to confirm.');

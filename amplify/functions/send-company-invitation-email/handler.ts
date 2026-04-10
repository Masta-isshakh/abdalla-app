import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

import { env } from '$amplify/env/send-company-invitation-email';
import type { Schema } from '../../data/resource';

const ses = new SESv2Client({});
const cognito = new CognitoIdentityProviderClient({});

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  return Array.from({ length: 14 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function provisionCompanyUser(userPoolId: string, email: string, temporaryPassword: string) {
  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: temporaryPassword,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: email.split('@')[0] || email },
        ],
      }),
    );
  } catch (error) {
    const errorName = error instanceof Error ? error.name : '';

    if (errorName !== 'UsernameExistsException') {
      throw error;
    }

    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: temporaryPassword,
        Permanent: false,
      }),
    );
  }

  await cognito.send(
    new AdminAddUserToGroupCommand({
      GroupName: 'company',
      UserPoolId: userPoolId,
      Username: email,
    }),
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const handler: Schema['sendCompanyInvitationEmail']['functionHandler'] = async (event) => {
  const sender = env.INVITATION_SENDER_EMAIL;
  const appName = env.APP_NAME ?? 'Jahzeen';
  const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const userPoolId = runtimeEnv?.USER_POOL_ID ?? '';
  const { companyName, inviteeEmail, invitedByEmail, message } = event.arguments;
  const normalizedInviteeEmail = normalize(inviteeEmail);

  if (!sender) {
    return {
      success: false,
      message: 'INVITATION_SENDER_EMAIL secret is not configured.',
      sentAtLabel: '',
    };
  }

  if (!userPoolId) {
    return {
      success: false,
      message: 'USER_POOL_ID is not configured for invitation provisioning.',
      sentAtLabel: '',
    };
  }

  const temporaryPassword = generateTemporaryPassword();

  try {
    await provisionCompanyUser(userPoolId, normalizedInviteeEmail, temporaryPassword);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unable to provision the company account.',
      sentAtLabel: '',
    };
  }

  const safeCompanyName = escapeHtml(companyName);
  const safeInvitedByEmail = escapeHtml(invitedByEmail);
  const safeMessage = escapeHtml(message ?? '');
  const safeUsername = escapeHtml(normalizedInviteeEmail);
  const safeTemporaryPassword = escapeHtml(temporaryPassword);
  const sentAtLabel = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `${appName}: your ${companyName} workspace invitation`;
  const textBody = [
    `You have been invited to manage ${companyName} on ${appName}.`,
    `Invited by: ${invitedByEmail}`,
    message ? `Message: ${message}` : '',
    `Username: ${normalizedInviteeEmail}`,
    `Temporary password: ${temporaryPassword}`,
    'Sign in with these credentials. On first sign-in, you will be asked to set a new password.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #17252F;">
      <h2 style="margin-bottom: 8px;">${appName} company invitation</h2>
      <p>You have been invited to manage <strong>${safeCompanyName}</strong>.</p>
      <p><strong>Invited by:</strong> ${safeInvitedByEmail}</p>
      ${safeMessage ? `<p><strong>Message:</strong> ${safeMessage}</p>` : ''}
      <p>Use the credentials below to access the company workspace:</p>
      <p><strong>Username:</strong> ${safeUsername}<br />
      <strong>Temporary password:</strong> ${safeTemporaryPassword}</p>
      <p>On first sign-in, the app will prompt you to create a new password.</p>
    </div>
  `;

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: sender,
        Destination: {
          ToAddresses: [normalizedInviteeEmail],
        },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: {
              Text: { Data: textBody },
              Html: { Data: htmlBody },
            },
          },
        },
      }),
    );

    return {
      success: true,
      message: `Invitation email sent to ${normalizedInviteeEmail}.`,
      sentAtLabel,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown SES error';
    return {
      success: false,
      message: reason,
      sentAtLabel: '',
    };
  }
};

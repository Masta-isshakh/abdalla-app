import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

import { env } from '$amplify/env/send-company-invitation-email';
import type { Schema } from '../../data/resource';

const cognito = new CognitoIdentityProviderClient({});

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getUserPoolRegion(userPoolId: string) {
  const [region] = userPoolId.split('_');
  return region || 'ap-south-1';
}

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  return Array.from({ length: 14 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function provisionCompanyUser(userPoolId: string, email: string, temporaryPassword: string) {
  const cognito = new CognitoIdentityProviderClient({ region: getUserPoolRegion(userPoolId) });

  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: temporaryPassword,
        DesiredDeliveryMediums: ['EMAIL'],
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
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: temporaryPassword,
        MessageAction: 'RESEND',
        DesiredDeliveryMediums: ['EMAIL'],
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
  const appName = env.APP_NAME ?? 'Jahzeen';
  const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const userPoolId = runtimeEnv?.USER_POOL_ID ?? '';
  const { companyName, inviteeEmail, invitedByEmail, message } = event.arguments;
  const normalizedInviteeEmail = normalize(inviteeEmail);

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
    const reason = error instanceof Error ? error.message : 'Unable to provision the company account.';
    return {
      success: false,
      message: reason,
      sentAtLabel: '',
    };
  }

  const safeCompanyName = escapeHtml(companyName);
  const safeInvitedByEmail = escapeHtml(invitedByEmail);
  const safeMessage = escapeHtml(message ?? '');
  const sentAtLabel = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return {
    success: true,
    message: `Invitation email sent to ${normalizedInviteeEmail} through Cognito.` +
      (safeMessage ? ` Message saved: ${safeMessage}` : '') +
      ` Invited by ${safeInvitedByEmail} for ${safeCompanyName} on ${appName}.`,
    sentAtLabel,
  };
};

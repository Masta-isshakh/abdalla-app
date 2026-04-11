import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

import { env } from '$amplify/env/send-company-invitation-email';
import type { Schema } from '../../data/resource';

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

function formatErrorReason(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Unable to complete the Cognito invitation flow.';
  }

  return error.name && error.message ? `${error.name}: ${error.message}` : error.message || 'Unable to complete the Cognito invitation flow.';
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

  return cognito;
}

async function addUserToCompanyGroup(
  cognito: CognitoIdentityProviderClient,
  userPoolId: string,
  email: string,
) {
  try {
    await cognito.send(
      new AdminAddUserToGroupCommand({
        GroupName: 'company',
        UserPoolId: userPoolId,
        Username: email,
      }),
    );
    return undefined;
  } catch (error) {
    return formatErrorReason(error);
  }
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
  let groupAssignmentWarning: string | undefined;

  try {
    const cognitoClient = await provisionCompanyUser(userPoolId, normalizedInviteeEmail, temporaryPassword);
    groupAssignmentWarning = await addUserToCompanyGroup(cognitoClient, userPoolId, normalizedInviteeEmail);
  } catch (error) {
    return {
      success: false,
      message: formatErrorReason(error),
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
      (groupAssignmentWarning ? ` Group assignment warning: ${groupAssignmentWarning}.` : '') +
      ` Invited by ${safeInvitedByEmail} for ${safeCompanyName} on ${appName}.`,
    sentAtLabel,
  };
};

import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { PostConfirmationTriggerHandler } from 'aws-lambda';

const cognito = new CognitoIdentityProviderClient({});
const MANUAL_ADMIN_EMAILS = new Set(['owner@jahzeen.app', 'admin@jahzeen.app']);

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function resolveGroup(email: string, requestedRole: string | undefined) {
  if (MANUAL_ADMIN_EMAILS.has(email) || requestedRole === 'admin') {
    return 'admin';
  }

  if (requestedRole === 'company') {
    return 'company';
  }

  return 'customer';
}

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const userPoolId = event.userPoolId;
  const username = event.userName;
  const email = normalize(event.request.userAttributes?.email);
  const requestedRole = normalize(event.request.clientMetadata?.appRole);
  const targetGroup = resolveGroup(email, requestedRole);

  await cognito.send(
    new AdminAddUserToGroupCommand({
      GroupName: targetGroup,
      UserPoolId: userPoolId,
      Username: username,
    }),
  );

  return event;
};

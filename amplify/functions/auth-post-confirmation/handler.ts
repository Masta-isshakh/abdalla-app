import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { PostConfirmationTriggerHandler } from 'aws-lambda';

type GraphqlResponse<TData> = {
  data?: TData;
  errors?: Array<{ message: string }>;
};

type InvitationItem = {
  id: string;
  status: string;
};

const runtimeEnv =
  typeof globalThis !== 'undefined' &&
  'process' in globalThis &&
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process!.env!
    : undefined;

const APPSYNC_URL = runtimeEnv?.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
const APPSYNC_API_KEY = runtimeEnv?.AMPLIFY_DATA_API_KEY;

const cognito = new CognitoIdentityProviderClient({});
const MANUAL_ADMIN_EMAILS = new Set(['owner@jahzeen.app', 'admin@jahzeen.app']);

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function resolveGroup(email: string, customRole: string | undefined) {
  if (MANUAL_ADMIN_EMAILS.has(email) || customRole === 'admin') {
    return 'admin';
  }

  if (customRole === 'company') {
    return 'company';
  }

  return 'customer';
}

async function hasPendingInvitation(email: string) {
  if (!APPSYNC_URL || !APPSYNC_API_KEY || !email) {
    return false;
  }

  const query = /* GraphQL */ `
    query ListCompanyInvitationsByEmail($email: String!) {
      listCompanyInvitations(
        filter: {
          and: [
            { email: { eq: $email } }
            { status: { eq: "pending" } }
          ]
        }
        limit: 1
      ) {
        items {
          id
          status
        }
      }
    }
  `;

  const response = await fetch(APPSYNC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': APPSYNC_API_KEY,
    },
    body: JSON.stringify({ query, variables: { email } }),
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as GraphqlResponse<{
    listCompanyInvitations?: { items?: InvitationItem[] };
  }>;
  const items = payload.data?.listCompanyInvitations?.items ?? [];

  return items.some((entry) => entry.status === 'pending');
}

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const userPoolId = event.userPoolId;
  const username = event.userName;
  const email = normalize(event.request.userAttributes?.email);
  const customRole = normalize(event.request.userAttributes?.['custom:appRole']);
  const invitedCompanyUser = await hasPendingInvitation(email);
  const targetGroup = invitedCompanyUser ? 'company' : resolveGroup(email, customRole);

  await cognito.send(
    new AdminAddUserToGroupCommand({
      GroupName: targetGroup,
      UserPoolId: userPoolId,
      Username: username,
    }),
  );

  return event;
};

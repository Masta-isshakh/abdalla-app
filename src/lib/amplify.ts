import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';

const AUTH_OUTPUT_OVERRIDE = {
  user_pool_id: 'ap-south-1_xtxWgu65e',
  aws_region: 'ap-south-1',
  user_pool_client_id: '387vff7pp2uh0vvn96m54q0fuj',
  identity_pool_id: 'ap-south-1:ed40cbb4-2a93-4a4e-9574-aacad38ac9ad',
} as const;

const DATA_OUTPUT_OVERRIDE = {
  url: 'https://frxxzqpyfbdixciyldr6u77neu.appsync-api.ap-south-1.amazonaws.com/graphql',
  aws_region: 'ap-south-1',
  default_authorization_type: 'AMAZON_COGNITO_USER_POOLS',
} as const;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const amplifyOutputs = require('../../amplify_outputs.json') as {
  auth?: {
    user_pool_id?: string;
    user_pool_client_id?: string;
    identity_pool_id?: string;
    aws_region?: string;
    username_attributes?: string[];
    standard_required_attributes?: string[];
  };
  data?: {
    url?: string;
    aws_region?: string;
    default_authorization_type?: string;
  };
};

const resolvedAmplifyOutputs = {
  ...amplifyOutputs,
  auth: {
    ...amplifyOutputs.auth,
    ...AUTH_OUTPUT_OVERRIDE,
  },
  data: {
    ...amplifyOutputs.data,
    ...DATA_OUTPUT_OVERRIDE,
  },
};

function toGraphQLAuthMode(value?: string): 'userPool' | 'iam' {
  if (value === 'AMAZON_COGNITO_USER_POOLS') {
    return 'userPool';
  }

  if (value === 'AWS_IAM') {
    return 'iam';
  }

  return 'userPool';
}

function buildAmplifyFallbackConfig() {
  const auth = resolvedAmplifyOutputs.auth;
  const data = resolvedAmplifyOutputs.data;

  if (!auth?.user_pool_id || !auth.user_pool_client_id || !auth.aws_region) {
    throw new Error('Amplify auth outputs are missing user pool configuration.');
  }

  return {
    Auth: {
      Cognito: {
        userPoolId: auth.user_pool_id,
        userPoolClientId: auth.user_pool_client_id,
        ...(auth.identity_pool_id ? { identityPoolId: auth.identity_pool_id } : {}),
        loginWith: {
          email: auth.username_attributes?.includes('email') ?? true,
        },
        userAttributes: {
          email: {
            required: auth.standard_required_attributes?.includes('email') ?? true,
          },
        },
      },
    },
    API: data?.url
      ? {
          GraphQL: {
            endpoint: data.url,
            region: data.aws_region ?? auth.aws_region,
            defaultAuthMode: toGraphQLAuthMode(data.default_authorization_type),
          },
        }
      : undefined,
  };
}

export function configureAmplify() {
  Amplify.configure(resolvedAmplifyOutputs);
  Amplify.configure(buildAmplifyFallbackConfig() as any);
}

configureAmplify();

export const dataClient = generateClient() as any;

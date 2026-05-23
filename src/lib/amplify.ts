import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';

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

const resolvedAmplifyOutputs = amplifyOutputs;

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
          phone: auth.username_attributes?.includes('phone_number') ?? auth.username_attributes?.includes('phone') ?? true,
        },
        userAttributes: {
          email: {
            required: auth.standard_required_attributes?.includes('email') ?? true,
          },
          phone_number: {
            required: auth.standard_required_attributes?.includes('phone_number') ?? false,
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

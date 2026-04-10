import { defineBackend } from '@aws-amplify/backend';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { auth } from './auth/resource';
import { data } from './data/resource';
import { authPostConfirmation } from './functions/auth-post-confirmation/resource';
import { authPreSignUp } from './functions/auth-pre-sign-up/resource';
import { sendCompanyInvitationEmail } from './functions/send-company-invitation-email/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  authPreSignUp,
  authPostConfirmation,
  sendCompanyInvitationEmail,
});

backend.sendCompanyInvitationEmail.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    sid: 'AllowSesInvitationEmails',
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  }),
);

(backend.sendCompanyInvitationEmail.resources.lambda as lambda.Function).addEnvironment(
  'USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId,
);

backend.sendCompanyInvitationEmail.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    sid: 'AllowCompanyUserProvisioning',
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminSetUserPassword',
    ],
    resources: ['*'],
  }),
);

import { defineBackend } from '@aws-amplify/backend';
import * as iam from 'aws-cdk-lib/aws-iam';

import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendCompanyInvitationEmail } from './functions/send-company-invitation-email/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  sendCompanyInvitationEmail,
});

backend.sendCompanyInvitationEmail.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    sid: 'AllowSesInvitationEmails',
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  }),
);

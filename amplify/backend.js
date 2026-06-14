import { defineBackend } from '@aws-amplify/backend';
import * as iam from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { authCustomMessage } from './functions/auth-custom-message/resource';
import { authPostConfirmation } from './functions/auth-post-confirmation/resource';
import { authPreSignUp } from './functions/auth-pre-sign-up/resource';
import { sendCompanyInvitationEmail } from './functions/send-company-invitation-email/resource';
const invitationAuthConfig = {
    userPoolId: 'ap-south-1_xtxWgu65e',
};
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
    auth,
    data,
    authCustomMessage,
    authPreSignUp,
    authPostConfirmation,
    sendCompanyInvitationEmail,
});
backend.auth.resources.cfnResources.cfnUserPoolClient.explicitAuthFlows = [
    'ALLOW_CUSTOM_AUTH',
    'ALLOW_USER_PASSWORD_AUTH',
    'ALLOW_USER_SRP_AUTH',
    'ALLOW_REFRESH_TOKEN_AUTH',
];
backend.sendCompanyInvitationEmail.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
    sid: 'AllowCompanyUserProvisioning',
    actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminAddUserToGroup',
    ],
    resources: ['*'],
}));
backend.sendCompanyInvitationEmail.resources.lambda.addEnvironment('USER_POOL_ID', invitationAuthConfig.userPoolId);

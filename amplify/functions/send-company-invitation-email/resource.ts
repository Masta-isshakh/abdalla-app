import { defineFunction } from '@aws-amplify/backend';

export const sendCompanyInvitationEmail = defineFunction({
  name: 'send-company-invitation-email',
  resourceGroupName: 'data',
  entry: './handler.ts',
  environment: {
    APP_NAME: 'Jahzeen',
    USER_POOL_ID: '',
  },
});

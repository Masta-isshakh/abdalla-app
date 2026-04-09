import { defineFunction, secret } from '@aws-amplify/backend';

export const sendCompanyInvitationEmail = defineFunction({
  name: 'send-company-invitation-email',
  entry: './handler.ts',
  environment: {
    INVITATION_SENDER_EMAIL: secret('INVITATION_SENDER_EMAIL'),
    APP_NAME: 'Jahzeen',
  },
});

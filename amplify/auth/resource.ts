import { defineAuth } from '@aws-amplify/backend';

import { authCustomMessage } from '../functions/auth-custom-message/resource';
import { authPostConfirmation } from '../functions/auth-post-confirmation/resource';
import { authPreSignUp } from '../functions/auth-pre-sign-up/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  groups: ['admin', 'company', 'customer'],
  loginWith: {
    email: true,
    phone: true,
  },
  triggers: {
    customMessage: authCustomMessage,
    preSignUp: authPreSignUp,
    postConfirmation: authPostConfirmation,
  },
  access: (allow) => [
    allow.resource(authPostConfirmation).to(['addUserToGroup']),
  ],
});

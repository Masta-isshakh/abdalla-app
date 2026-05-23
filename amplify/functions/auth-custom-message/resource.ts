import { defineFunction } from '@aws-amplify/backend';

export const authCustomMessage = defineFunction({
  name: 'auth-custom-message',
  entry: './handler.ts',
});

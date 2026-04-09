import { defineFunction } from '@aws-amplify/backend';

export const authPostConfirmation = defineFunction({
  name: 'auth-post-confirmation',
  entry: './handler.ts',
});

import { defineFunction } from '@aws-amplify/backend';

export const authPreSignUp = defineFunction({
  name: 'auth-pre-sign-up',
  entry: './handler.ts',
});

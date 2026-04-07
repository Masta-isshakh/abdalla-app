import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';

let isConfigured = false;

export function configureAmplify() {
  if (isConfigured) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const outputs = require('../../amplify_outputs.json');
    Amplify.configure(outputs);
    isConfigured = true;
  } catch (error) {
    console.warn('Amplify configuration was skipped.', error);
  }
}

export const dataClient = generateClient() as any;

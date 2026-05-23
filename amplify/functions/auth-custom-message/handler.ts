import type { CustomMessageTriggerHandler } from 'aws-lambda';

const APP_NAME = 'Jahzeen';

export const handler: CustomMessageTriggerHandler = async (event) => {
  const code = event.request.codeParameter || '{####}';

  if (
    event.triggerSource === 'CustomMessage_SignUp' ||
    event.triggerSource === 'CustomMessage_ResendCode' ||
    event.triggerSource === 'CustomMessage_VerifyUserAttribute'
  ) {
    event.response.smsMessage = `${APP_NAME} verification code: ${code}. This code expires shortly. Do not share this code with anyone.`;
    event.response.emailSubject = `${APP_NAME} verification code`;
    event.response.emailMessage = `Your ${APP_NAME} verification code is ${code}. If you did not request this, please ignore this message.`;
  }

  return event;
};

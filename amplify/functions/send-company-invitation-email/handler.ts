import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

import { env } from '$amplify/env/send-company-invitation-email';
import type { Schema } from '../../data/resource';

const ses = new SESv2Client({});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const handler: Schema['sendCompanyInvitationEmail']['functionHandler'] = async (event) => {
  const sender = env.INVITATION_SENDER_EMAIL;
  const appName = env.APP_NAME ?? 'Jahzeen';
  const { companyName, inviteeEmail, invitedByEmail, message } = event.arguments;

  if (!sender) {
    return {
      success: false,
      message: 'INVITATION_SENDER_EMAIL secret is not configured.',
      sentAtLabel: '',
    };
  }

  const safeCompanyName = escapeHtml(companyName);
  const safeInvitedByEmail = escapeHtml(invitedByEmail);
  const safeMessage = escapeHtml(message ?? '');
  const sentAtLabel = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `${appName}: your ${companyName} workspace invitation`;
  const textBody = [
    `You have been invited to manage ${companyName} on ${appName}.`,
    `Invited by: ${invitedByEmail}`,
    message ? `Message: ${message}` : '',
    'Create or sign in with this email to access your company workspace.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #17252F;">
      <h2 style="margin-bottom: 8px;">${appName} company invitation</h2>
      <p>You have been invited to manage <strong>${safeCompanyName}</strong>.</p>
      <p><strong>Invited by:</strong> ${safeInvitedByEmail}</p>
      ${safeMessage ? `<p><strong>Message:</strong> ${safeMessage}</p>` : ''}
      <p>Create or sign in with this email address to access the company workspace.</p>
    </div>
  `;

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: sender,
        Destination: {
          ToAddresses: [inviteeEmail],
        },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: {
              Text: { Data: textBody },
              Html: { Data: htmlBody },
            },
          },
        },
      }),
    );

    return {
      success: true,
      message: `Invitation email sent to ${inviteeEmail}.`,
      sentAtLabel,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown SES error';
    return {
      success: false,
      message: reason,
      sentAtLabel: '',
    };
  }
};

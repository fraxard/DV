const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const sendVerificationEmail = async ({ email, token }) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'DigiVirasat <onboarding@resend.dev>';
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: 'Your DigiVirasat verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h2 style="margin-bottom: 8px;">Verify your DigiVirasat account</h2>

        <p style="color: #555;">
          Use the verification code below to continue:
        </p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 20px 0;
        ">
          ${token}
        </div>

        <p style="color: #777;">
          This code expires in 10 minutes.
        </p>

        <p style="color: #777;">
          If you didn't create a DigiVirasat account, you can safely ignore this email.
        </p>

        <p style="margin-top: 32px;">
          — DigiVirasat
        </p>
      </div>
    `,
  });
  
  if (error) {
    console.error('[Resend Verification Email Error]:', error.message || error);
    throw error;
  }

  return data;
};

const sendSupportNotificationEmail = async ({
  name,
  email,
  subject,
  message,
  submissionId,
  createdAt,
}) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'DigiVirasat <onboarding@resend.dev>';
  const toEmail = process.env.SUPPORT_INBOX_EMAIL || 'fraxard@gmail.com';
  const formattedDate = createdAt ? new Date(createdAt).toUTCString() : new Date().toUTCString();

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      reply_to: email,
      subject: `Support Request - ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #1f2937;">
          <div style="border-bottom: 2px solid #1B4FD8; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1B4FD8; font-size: 20px; font-weight: 700;">DigiVirasat Support Notification</h2>
            <span style="font-size: 12px; color: #6b7280;">Ticket ID: ${submissionId || 'N/A'}</span>
          </div>

          <div style="background-color: #f9fafb; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; border: 1px solid #f3f4f6;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #6b7280; width: 110px;"><strong>Submitter:</strong></td>
                <td style="padding: 4px 0; color: #111827; font-weight: 600;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;"><strong>Email:</strong></td>
                <td style="padding: 4px 0;"><a href="mailto:${safeEmail}" style="color: #1B4FD8; text-decoration: none;">${safeEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;"><strong>Subject:</strong></td>
                <td style="padding: 4px 0; color: #111827;">${safeSubject}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;"><strong>Timestamp:</strong></td>
                <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">${formattedDate}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563;">Message:</h3>
            <div style="font-size: 15px; line-height: 1.6; color: #1f2937; background: #ffffff; padding: 16px; border: 1px solid #e5e7eb; border-radius: 6px; white-space: pre-wrap;">${safeMessage}</div>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 12px; color: #9ca3af; text-align: center;">
            <p style="margin: 0;">Hit <strong>Reply</strong> to respond directly to ${safeName} (${safeEmail}).</p>
            <p style="margin: 4px 0 0 0;">DigiVirasat Platform • Digital Legacy Protection</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend Support Delivery Error]:', error.message || error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[Resend Support Exception]:', err.message || err);
    return { success: false, error: err.message || 'Unknown email delivery error' };
  }
};

module.exports = {
  sendVerificationEmail,
  sendSupportNotificationEmail,
};

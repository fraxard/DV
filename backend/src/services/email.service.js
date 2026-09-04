const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async ({ email, token }) => {
    const { data, error } = await resend.emails.send({
        from: 'DigiVirasat <onboarding@resend.dev>',
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
    console.log('RESEND EMAIL RESULT:', { data, error });
    if (error) {
        throw error;
    }

    return data;
};

module.exports = {
    sendVerificationEmail,
};
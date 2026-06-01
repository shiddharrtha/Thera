const nodemailer = require('nodemailer');

function buildResetEmailText(code) {
  return [
    `Your verification code is ${code}.`,
    '',
    'Open the Thera app, enter this code, and choose a new password.',
    'The code expires in 10 minutes.',
    '',
    'If you did not request a password reset, you can ignore this email.',
  ].join('\n');
}

function buildResetEmailHtml(code) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #1B6B38; font-size: 22px; margin-bottom: 8px;">Reset your password</h1>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">
        Enter this code in the Thera app to choose a new password. It expires in 10 minutes.
      </p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; text-align: center; margin: 24px 0;">
        ${code}
      </p>
      <p style="color: #9ca3af; font-size: 13px;">
        If you did not request this, you can ignore this email.
      </p>
    </div>
  `.trim();
}

async function sendViaResend(toEmail, code) {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Thera <onboarding@resend.dev>';

  if (!resendKey) {
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: 'Your Thera password reset code',
      text: buildResetEmailText(code),
      html: buildResetEmailHtml(code),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('Resend email failed', response.status, body);
    let message = 'Failed to send verification email via Resend';
    try {
      const parsed = JSON.parse(body);
      if (parsed.message) message = parsed.message;
    } catch {
      // keep default message
    }
    const error = new Error(message);
    error.code = 'email/send-failed';
    throw error;
  }

  return true;
}

async function sendViaSmtp(toEmail, code) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  const from = process.env.SMTP_FROM || user;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Your Thera password reset code',
    text: buildResetEmailText(code),
  });

  return true;
}

/** @returns {Promise<boolean>} true if an email was sent */
async function sendPasswordResetCodeEmail(toEmail, code) {
  if (await sendViaResend(toEmail, code)) {
    return true;
  }

  if (await sendViaSmtp(toEmail, code)) {
    return true;
  }

  const error = new Error(
    'No email provider configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS on Cloud Functions.',
  );
  error.code = 'email/not-configured';
  throw error;
}

module.exports = { sendPasswordResetCodeEmail };

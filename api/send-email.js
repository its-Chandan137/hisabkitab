import nodemailer from 'nodemailer';

function isAuthorized(request) {
  const internalKey = process.env.INTERNAL_API_KEY;
  return Boolean(internalKey && request.headers['x-internal-key'] === internalKey);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const { to, subject, html } = request.body || {};

    if (!to || !subject || !html) {
      return response
        .status(400)
        .json({ error: 'to, subject, and html are required.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"HisabKitab" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return response.status(200).json({ success: true });
  } catch (error) {
    return response
      .status(500)
      .json({ error: error.message || 'Unable to send email.' });
  }
}

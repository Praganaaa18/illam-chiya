const isSmtpConfigured = () => (
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
);

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const { SMTPClient } = await import('emailjs');
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const client = new SMTPClient({
    host: process.env.SMTP_HOST,
    port,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    ssl: secure,
    tls: !secure,
  });

  try {
    await client.sendAsync({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'Reset your Illam Chiya password',
      text: `Hello ${name},\n\nUse this link within one hour to reset your password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    });
  } finally {
    client.smtp.close();
  }
};

module.exports = { isSmtpConfigured, sendPasswordResetEmail };

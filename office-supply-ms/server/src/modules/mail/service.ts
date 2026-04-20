import nodemailer from 'nodemailer';

interface MailPayload {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

let transporter: nodemailer.Transporter | null = null;
let warnedAboutConfig = false;

function isMailEnabled() {
  return (process.env.MAIL_ENABLED || 'false').toLowerCase() === 'true';
}

function getMailConfig(): MailConfig {
  return {
    host: process.env.MAIL_HOST || '',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
    from: process.env.MAIL_FROM || '',
    secure: (process.env.MAIL_SECURE || 'false').toLowerCase() === 'true',
  };
}

function isConfigured(config: MailConfig) {
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function getTransporter(config: MailConfig) {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

export async function sendMail(payload: MailPayload): Promise<void> {
  if (!isMailEnabled()) {
    return;
  }

  const config = getMailConfig();
  if (!isConfigured(config)) {
    if (!warnedAboutConfig) {
      warnedAboutConfig = true;
      console.warn('MAIL_ENABLED is true but SMTP configuration is incomplete. Emails will be skipped.');
    }
    return;
  }

  const to = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;
  const mailer = getTransporter(config);

  await mailer.sendMail({
    from: config.from,
    to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

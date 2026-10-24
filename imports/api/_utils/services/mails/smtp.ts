import fs from 'fs';
import path from 'path';
import { Meteor } from 'meteor/meteor';
import { Email } from 'meteor/email';

export interface SmtpSettings {
  host: string;
  port: string | number;
  userName: string;
  password: string;
  fromEmail: string;
}

let cached: SmtpSettings | null | undefined;

function fromFile(file: string): SmtpSettings | null {
  try {
    const smtp = JSON.parse(fs.readFileSync(file, 'utf8'))?.mailCredentials
      ?.smtp;
    return smtp?.host ? smtp : null;
  } catch {
    return null;
  }
}

// The SMTP password is a secret and stays out of git: SMTP_PASSWORD in the
// environment, else that line in the checkout's .env (gitignored; the dev
// container does not get it as an environment variable). A password still
// in the settings is only a last resort.
function readSmtpPassword(): string | undefined {
  if (process.env.SMTP_PASSWORD) {
    return process.env.SMTP_PASSWORD;
  }
  if (!process.env.PWD) {
    return undefined;
  }
  try {
    const env = fs.readFileSync(path.join(process.env.PWD, '.env'), 'utf8');
    const line = env.match(/^\s*SMTP_PASSWORD\s*=\s*(.*)\s*$/m)?.[1];
    if (!line) {
      return undefined;
    }
    const quoted = line.match(/^(["'])(.*)\1$/);
    return quoted ? (quoted[1] === '"' ? JSON.parse(line) : quoted[2]) : line;
  } catch {
    return undefined;
  }
}

const withPassword = (smtp: SmtpSettings): SmtpSettings => ({
  ...smtp,
  password: readSmtpPassword() || smtp.password,
});

/**
 * The SMTP account mail goes out through. Normally
 * `Meteor.settings.mailCredentials.smtp`; when the settings the server was
 * started with lack it (the dev container on the office Mac gets a
 * METEOR_SETTINGS without mail credentials), it is read from the settings
 * file instead — METEOR_SETTINGS_FILE, else docker/settings.json in the
 * checkout, the file docker-compose mounts. The password comes from
 * readSmtpPassword().
 */
export function getSmtpSettings(): SmtpSettings | null {
  if (cached !== undefined) {
    return cached;
  }
  const settings = (Meteor.settings as any)?.mailCredentials?.smtp;
  if (settings?.host) {
    cached = withPassword(settings);
    return cached;
  }
  const candidates = [
    process.env.METEOR_SETTINGS_FILE,
    process.env.PWD && path.join(process.env.PWD, 'docker', 'settings.json'),
  ].filter(Boolean) as string[];
  for (const file of candidates) {
    const smtp = fromFile(file);
    if (smtp) {
      console.info(`[mail] SMTP settings read from ${file}`);
      cached = withPassword(smtp);
      return cached;
    }
  }
  cached = null;
  return cached;
}

// Port 465 is TLS from the first byte; anything else upgrades with STARTTLS.
export function mailUrlFor(smtp: SmtpSettings): string {
  const scheme = String(smtp.port) === '465' ? 'smtps' : 'smtp';
  return `${scheme}://${encodeURIComponent(smtp.userName)}:${encodeURIComponent(
    smtp.password
  )}@${smtp.host}:${smtp.port}`;
}

// Without MAIL_URL Meteor's Email "sends" by printing the message to the
// server log and reports success — so nothing arrived and nobody knew.
// Refuse instead, so the person who asked for the mail sees an error.
export async function deliverEmail(
  options: Parameters<typeof Email.sendAsync>[0]
): Promise<void> {
  if (!process.env.MAIL_URL) {
    throw new Meteor.Error(
      'mail-not-configured',
      'Email is not configured on this server'
    );
  }
  await Email.sendAsync(options);
}

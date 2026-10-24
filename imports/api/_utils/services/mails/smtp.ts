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

/**
 * The SMTP account mail goes out through. Normally
 * `Meteor.settings.mailCredentials.smtp`; when the settings the server was
 * started with lack it (the dev container on the office Mac gets a
 * METEOR_SETTINGS without mail credentials), it is read from the settings
 * file instead — METEOR_SETTINGS_FILE, else docker/settings.json in the
 * checkout, the file docker-compose mounts.
 */
export function getSmtpSettings(): SmtpSettings | null {
  if (cached !== undefined) {
    return cached;
  }
  const settings = (Meteor.settings as any)?.mailCredentials?.smtp;
  if (settings?.host) {
    cached = settings;
    return cached as SmtpSettings;
  }
  const candidates = [
    process.env.METEOR_SETTINGS_FILE,
    process.env.PWD && path.join(process.env.PWD, 'docker', 'settings.json'),
  ].filter(Boolean) as string[];
  for (const file of candidates) {
    const smtp = fromFile(file);
    if (smtp) {
      console.info(`[mail] SMTP settings read from ${file}`);
      cached = smtp;
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

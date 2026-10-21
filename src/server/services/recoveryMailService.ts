import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/** Optional feature: absent/invalid SMTP disables recovery, never the whole site. */
export function recoveryMailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const from = (process.env.SMTP_FROM || process.env.EMAIL_FROM)?.trim();
  if (!host || !user || !pass || !from || ![465, 587].includes(port)) return null;
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) return null;
  try {
    const url = new URL(env.appUrl);
    if (url.username || url.password || (env.isProduction && url.protocol !== 'https:')) return null;
  } catch { return null; }
  return { host, port, user, pass, from };
}

export function recoveryTransport() {
  const config = recoveryMailConfig();
  if (!config) throw new Error('RECOVERY_SMTP_UNAVAILABLE');
  return nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false, debug: false,
  });
}

export const recoveryMailer = {
  configured: () => Boolean(recoveryMailConfig()),
  async send(to: string, link: string) {
    const config = recoveryMailConfig();
    if (!config) throw new Error('RECOVERY_SMTP_UNAVAILABLE');
    const transport = recoveryTransport();
    try {
      const result = await transport.sendMail({
        from: { name: 'Itapoá Online', address: config.from }, to,
        subject: 'Redefina sua senha — Itapoá Online',
        text: `Recebemos uma solicitação para redefinir sua senha no Itapoá Online.\n\nAbra o link abaixo para escolher uma nova senha:\n${link}\n\nO link é válido por 15 minutos e só pode ser usado uma vez. Se você não solicitou, ignore esta mensagem. Sua senha não foi alterada.`,
        disableFileAccess: true, disableUrlAccess: true,
      });
      if (!result.accepted?.length || result.rejected?.length) throw new Error('RECOVERY_SMTP_REJECTED');
    } finally { transport.close(); }
  },
};

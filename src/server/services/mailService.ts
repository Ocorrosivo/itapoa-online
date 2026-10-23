import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export function mailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || process.env.SMTP_USERNAME)?.trim();
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const from = (process.env.SMTP_FROM || process.env.EMAIL_FROM)?.trim();

  if (!host || !user || !pass || !from || ![465, 587].includes(port)) return null;
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) return null;

  try {
    const url = new URL(env.appUrl);
    if (url.username || url.password || (env.isProduction && url.protocol !== 'https:')) return null;
  } catch {
    return null;
  }

  return { host, port, user, pass, from };
}

export function createMailTransport() {
  const config = mailConfig();
  if (!config) throw new Error('SMTP_UNAVAILABLE');
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const mailService = {
  isConfigured: () => Boolean(mailConfig()),

  async send({ to, subject, text, html }: SendMailOptions): Promise<{ accepted: boolean; messageId?: string }> {
    const config = mailConfig();
    if (!config) {
      console.warn('[mail] SMTP not configured; no message sent');
      return { accepted: false };
    }

    const transport = createMailTransport();
    try {
      const result = await transport.sendMail({
        from: { name: 'Itapoá Online', address: config.from },
        to,
        subject,
        text,
        ...(html ? { html } : {}),
        disableFileAccess: true,
        disableUrlAccess: true,
      });

      if (!result.accepted?.length || result.rejected?.length) {
        throw new Error('SMTP_REJECTED');
      }

      return { accepted: true, messageId: result.messageId };
    } catch {
      // The API error funnel logs error.message: never forward raw SMTP replies.
      throw new Error('SMTP_DELIVERY_FAILED');
    } finally {
      transport.close();
    }
  },

  async sendVerification(to: string, verificationLink: string): Promise<{ accepted: boolean; messageId?: string }> {
    const subject = 'Confirme seu e-mail — Itapoá Online';
    const text = `Olá!\n\nObrigado por se cadastrar no Itapoá Online.\n\nPara confirmar seu e-mail e ativar sua conta, abra o link abaixo no seu navegador:\n${verificationLink}\n\nEste link é válido por 24 horas e só pode ser utilizado uma vez.\n\nSe você não realizou este cadastro, ignore esta mensagem.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <h2 style="color: #0f172a; margin-bottom: 16px;">Confirmação de Cadastro — Itapoá Online</h2>
        <p style="font-size: 15px; line-height: 1.6;">Olá,</p>
        <p style="font-size: 15px; line-height: 1.6;">Obrigado por se cadastrar no portal oficial de conexões comerciais de Itapoá.</p>
        <p style="font-size: 15px; line-height: 1.6;">Clique no botão abaixo para confirmar seu e-mail e continuar o acesso:</p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${verificationLink}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">Confirmar meu e-mail</a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">O link é válido por 24 horas. Se o botão não funcionar, copie e cole o endereço abaixo no seu navegador:<br><span style="word-break: break-all; color: #3b82f6;">${verificationLink}</span></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Se você não realizou este cadastro, nenhuma ação é necessária.</p>
      </div>
    `;

    return this.send({ to, subject, text, html });
  },

  /** Envio único autorizado pelo usuário para validação institucional */
  async sendAuthorizedTest(): Promise<{ accepted: boolean; messageId?: string; timestamp: string }> {
    const to = 'suprememidias.ok@gmail.com';
    const subject = 'Teste de envio — Itapoá Online';
    const text = 'Este é um teste do sistema de e-mails do Itapoá Online para verificar o envio das mensagens de cadastro e confirmação.';
    const result = await this.send({ to, subject, text });
    return { ...result, timestamp: new Date().toISOString() };
  }
};

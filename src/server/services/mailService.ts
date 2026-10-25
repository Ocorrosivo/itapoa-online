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

export interface PortalEmailOptions {
  title: string;
  recipientName?: string;
  leadParagraph: string;
  orderBadge?: string;
  howToUseSubtitle: string;
  steps: string[];
  securityNote?: string;
  ctaText: string;
  ctaUrl: string;
  feedbackTitle?: string;
  feedbackText?: string;
  feedbackButtonText?: string;
  feedbackUrl?: string;
}

export function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPortalEmail(opts: PortalEmailOptions): string {
  const name = opts.recipientName?.trim() ? escapeHtml(opts.recipientName.trim()) : 'Empreendedor(a)';
  const stepsHtml = opts.steps
    .map(
      (step) => `
      <li style="margin-bottom: 8px; padding-left: 2px;">
        <span style="color: #334155; font-size: 13px; line-height: 1.6;">${step}</span>
      </li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
    <!-- Top Header Black / Dark with Portal Brand -->
    <tr>
      <td style="background-color: #080F24; padding: 26px 20px; text-align: center;">
        <img src="https://itapoa.online/logotipo.png" alt="Itapoá Online" width="160" style="display: block; margin: 0 auto 8px auto; max-width: 160px; height: auto; border: 0;" />
        <div style="color: #F59E0B; font-size: 14px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">ITAPOÁ ONLINE</div>
        <div style="color: #94A3B8; font-size: 11px; margin-top: 2px; letter-spacing: 0.5px;">PORTAL COMERCIAL E TURÍSTICO OFICIAL</div>
      </td>
    </tr>

    <!-- Email Content Body -->
    <tr>
      <td style="padding: 32px 28px 24px 28px; color: #1E293B;">
        <h1 style="color: #0F172A; font-size: 22px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.25;">${escapeHtml(opts.title)}</h1>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">Olá, <strong>${name}</strong>. ${opts.leadParagraph}</p>
        
        ${
          opts.orderBadge
            ? `
        <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0; padding-bottom: 4px;">
          ${opts.orderBadge}
        </div>`
            : ''
        }

        <!-- Como Usar / Passo a Passo -->
        <div style="margin: 20px 0 24px 0;">
          <div style="font-weight: 900; font-size: 13px; color: #0F172A; text-transform: uppercase; margin-bottom: 4px;">Como usar</div>
          <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">${escapeHtml(opts.howToUseSubtitle)}</div>
          <ol style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.6;">
            ${stepsHtml}
          </ol>
          ${
            opts.securityNote
              ? `
          <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin-top: 14px; margin-bottom: 0;">
            ${opts.securityNote}
          </p>`
              : ''
          }
        </div>

        <!-- Botão CTA Principal Amarelo/Dourado -->
        <div style="margin: 24px 0 28px 0; text-align: left;">
          <a href="${opts.ctaUrl}" style="background-color: #F59E0B; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #080F24; padding: 13px 26px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; letter-spacing: 0.2px;">${escapeHtml(opts.ctaText)}</a>
        </div>

        <!-- Caixa de Avaliação com Borda Amarela -->
        <div style="border: 2px solid #FCD34D; background-color: #FFFDF5; border-radius: 12px; padding: 20px; margin: 26px 0 24px 0;">
          <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">${escapeHtml(opts.feedbackTitle || 'Deixe a sua avaliação da nossa plataforma')}</div>
          <p style="margin: 0 0 14px 0; font-size: 12px; color: #475569; line-height: 1.5;">${escapeHtml(opts.feedbackText || 'Sua opinião vale muito para fortalecer o comércio e as empresas de Itapoá. Compartilhe sua experiência e ajude a impulsionar os negócios da nossa cidade!')}</p>
          <a href="${opts.feedbackUrl || 'https://itapoa.online'}" style="background-color: #080F24; color: #F59E0B; padding: 9px 18px; border-radius: 6px; font-size: 12px; font-weight: 700; text-decoration: none; display: inline-block;">${escapeHtml(opts.feedbackButtonText || 'Avaliar no portal')}</a>
        </div>

        <!-- Caixa Escura Inferior (Acesso Exclusivo & Redes) -->
        <div style="background-color: #080F24; border-radius: 12px; padding: 22px 20px; margin: 24px 0; color: #ffffff;">
          <div style="color: #F59E0B; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">ACESSO EXCLUSIVO</div>
          <div style="color: #FFFFFF; font-size: 15px; font-weight: 800; line-height: 1.3; margin-bottom: 8px;">Não perca as novidades comerciais de Itapoá</div>
          <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 0 0 16px 0;">Fique por dentro das novidades, eventos, vagas de emprego e novas empresas cadastradas no portal oficial da nossa cidade.</p>
          <div>
            <a href="https://wa.me/5547997190413" style="background-color: #22C55E; color: #FFFFFF; font-weight: 700; font-size: 12px; padding: 10px 16px; border-radius: 6px; text-decoration: none; display: inline-block; margin-right: 8px; margin-bottom: 6px;">Entrar no canal do WhatsApp</a>
            <a href="https://instagram.com/itapoaonline" style="background-color: #F59E0B; color: #080F24; font-weight: 700; font-size: 12px; padding: 10px 16px; border-radius: 6px; text-decoration: none; display: inline-block; margin-bottom: 6px;">Seguir no Instagram</a>
          </div>
        </div>

        <!-- Rodapé & Suporte -->
        <p style="font-size: 12px; color: #64748B; text-align: center; margin: 24px 0 6px 0; line-height: 1.5;">
          Deu algum problema com o seu acesso? Fale diretamente com a equipe do portal pelo e-mail <a href="mailto:contato@itapoa.online" style="color: #0284C7; text-decoration: underline;">contato@itapoa.online</a> ou suporte no WhatsApp.
        </p>
        <p style="font-size: 11px; color: #94A3B8; text-align: center; margin: 0; line-height: 1.4;">
          Você recebeu este e-mail oficial porque realizou uma ação em <strong>itapoa.online</strong>.<br />
          &copy; ${new Date().getFullYear()} Itapoá Online — Guia Comercial e Turístico Oficial.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

  async sendVerification(to: string, verificationLink: string, recipientName?: string): Promise<{ accepted: boolean; messageId?: string }> {
    const name = recipientName?.trim() || 'Empreendedor(a)';
    const subject = 'Confirme seu e-mail — Itapoá Online';
    const text = `Olá, ${name}!\n\nObrigado por se cadastrar no Itapoá Online.\n\nCOMO USAR — PASSO A PASSO PARA ATIVAR SUA CONTA E PUBLICAR SUA EMPRESA:\n1. Abra o link de confirmação no seu navegador:\n${verificationLink}\n2. Acesse sua conta com seu e-mail cadastrado.\n3. Complete o perfil da sua empresa com endereço, fotos e horários.\n4. Cadastre seu WhatsApp direto para atendimento comercial.\n5. Sua vitrine comercial ficará disponível para toda a cidade!\n\nEste link é válido por 24 horas e só pode ser utilizado uma vez.\nSe você não realizou este cadastro, ignore esta mensagem.\n\nSuporte: contato@itapoa.online | WhatsApp: (47) 99719-0413`;

    const html = renderPortalEmail({
      title: 'Confirme seu cadastro no Itapoá Online',
      recipientName: name,
      leadParagraph: 'seu cadastro no portal oficial de conexões comerciais de Itapoá foi iniciado com sucesso.',
      orderBadge: 'Ativação de Conta — Acesso Imediato ao Portal',
      howToUseSubtitle: 'PASSO A PASSO PARA ATIVAR SUA CONTA E PUBLICAR SUA EMPRESA',
      steps: [
        'Clique no botão amarelo abaixo para confirmar seu e-mail e ativar seu acesso oficial.',
        'Faça login na sua conta no Itapoá Online com seu e-mail e senha cadastrados.',
        'Acesse a área do lojista e complete o perfil da sua empresa (logotipo, fotos e horários).',
        'Cadastre seu WhatsApp direto para receber mensagens de clientes da cidade.',
        'Sua vitrine comercial já estará pronta para ser vista por milhares de moradores e turistas!'
      ],
      securityNote: 'Não compartilhe este link com terceiros. O link de confirmação é válido por 24 horas e expira após o uso.',
      ctaText: 'Confirmar meu cadastro',
      ctaUrl: verificationLink,
      feedbackTitle: 'Deixe a sua avaliação da nossa plataforma',
      feedbackText: 'Sua opinião vale muito para fortalecer o comércio e as empresas de Itapoá. Conte para nós como foi sua experiência!',
      feedbackButtonText: 'Avaliar no portal',
      feedbackUrl: 'https://itapoa.online'
    });

    return this.send({ to, subject, text, html });
  },

  /** Envio automático disparado quando um pagamento / assinatura é aprovado */
  async sendPaymentApproved(options: {
    to: string;
    name?: string;
    companyName: string;
    planName: string;
    orderId: string;
    amount?: string;
  }): Promise<{ accepted: boolean; messageId?: string }> {
    const name = options.name?.trim() || 'Empreendedor(a)';
    const company = options.companyName?.trim() || 'Sua Empresa';
    const plan = options.planName?.trim() || 'Plano Comercial';
    const order = options.orderId?.trim() || 'PED-ITP';
    const subject = `Seu pedido ${order} foi entregue — Itapoá Online`;

    const panelUrl = 'https://itapoa.online/painel';

    const text = `Olá, ${name}!\n\nO seu pedido ${order} já está disponível na sua conta.\n\nPlano: ${plan} — ${company}\n${options.amount ? `Valor confirmado: ${options.amount}\n` : ''}\nCOMO USAR — PASSO A PASSO PARA APROVEITAR SEU PLANO:\n1. Acesse seu painel de controle no Itapoá Online: ${panelUrl}\n2. Confira os benefícios e limites ativos para ${company}.\n3. Atualize o catálogo de produtos, fotos e promoções em destaque.\n4. Acompanhe cliques no WhatsApp e métricas de visitantes em tempo real.\n5. Seu negócio já conta com prioridade na busca e visibilidade ampliada!\n\nNão compartilhe suas credenciais. Se precisar de qualquer ajuda, nosso suporte está à disposição.\n\nSuporte: contato@itapoa.online | WhatsApp: (47) 99719-0413`;

    const html = renderPortalEmail({
      title: 'Seu pedido foi entregue',
      recipientName: name,
      leadParagraph: `O pedido <strong>${escapeHtml(order)}</strong> já está disponível na sua conta.`,
      orderBadge: `${escapeHtml(plan)} — Ativação para ${escapeHtml(company)}${options.amount ? ` (${escapeHtml(options.amount)})` : ''}`,
      howToUseSubtitle: `PASSO A PASSO PARA APROVEITAR SEU PLANO EM ${escapeHtml(company.toUpperCase())}`,
      steps: [
        'Acesse seu painel comercial pelo botão amarelo abaixo para gerenciar seu anúncio.',
        `Confira os recursos exclusivos do plano <strong>${escapeHtml(plan)}</strong> já liberados para sua empresa.`,
        'Adicione ou atualize produtos, ofertas especiais, fotos de alta qualidade e contatos.',
        'Acompanhe as métricas em tempo real: visualizações de página, cliques no WhatsApp e avaliações.',
        'Sua empresa já está com destaque e posicionamento prioritário para clientes em Itapoá!'
      ],
      securityNote: 'Guarde suas credenciais em segurança. O comprovante detalhado fica registrado permanentemente na sua conta.',
      ctaText: 'Ver meu pedido no painel',
      ctaUrl: panelUrl,
      feedbackTitle: 'Deixe a sua avaliação e fortaleça nossa comunidade',
      feedbackText: 'Sua parceria como lojista é fundamental para fazermos de Itapoá uma cidade cada vez mais conectada. Conte sua experiência com o portal!',
      feedbackButtonText: 'Avaliar no portal',
      feedbackUrl: 'https://itapoa.online'
    });

    return this.send({ to: options.to, subject, text, html });
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

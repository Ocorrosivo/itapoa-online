import { mailConfig, createMailTransport, renderPortalEmail } from './mailService.js';

/** Optional feature: absent/invalid SMTP disables recovery, never the whole site. */
export function recoveryMailConfig() {
  return mailConfig();
}

export function recoveryTransport() {
  const config = recoveryMailConfig();
  if (!config) throw new Error('RECOVERY_SMTP_UNAVAILABLE');
  return createMailTransport();
}

export const recoveryMailer = {
  configured: () => Boolean(recoveryMailConfig()),
  async send(to: string, link: string, name?: string) {
    const config = recoveryMailConfig();
    if (!config) throw new Error('RECOVERY_SMTP_UNAVAILABLE');
    const transport = recoveryTransport();
    const recipientName = name?.trim() || 'Usuário(a)';
    const text = `Olá, ${recipientName}!\n\nRecebemos uma solicitação para redefinir sua senha no Itapoá Online.\n\nAbra o link abaixo para escolher uma nova senha:\n${link}\n\nO link é válido por 15 minutos e só pode ser usado uma vez. Se você não solicitou, ignore esta mensagem. Sua senha não foi alterada.\n\nSuporte: contato@itapoa.online | WhatsApp: (47) 99719-0413`;

    const html = renderPortalEmail({
      title: 'Redefinição de Senha',
      recipientName,
      leadParagraph: 'recebemos uma solicitação para redefinir a senha da sua conta no portal oficial Itapoá Online.',
      orderBadge: 'Segurança da Conta — Solicitação de Nova Senha',
      howToUseSubtitle: 'PASSO A PASSO PARA ESCOLHER UMA NOVA SENHA SEGURA',
      steps: [
        'Clique no botão amarelo abaixo para acessar a página segura de alteração de senha.',
        'Crie uma senha forte com pelo menos 8 caracteres.',
        'Confirme a nova senha e faça login na sua conta.',
        'Suas sessões anteriores em outros aparelhos serão encerradas automaticamente por segurança.'
      ],
      securityNote: 'O link acima é de uso único e expira em 15 minutos. Se você não fez esta solicitação, desconsidere este e-mail: sua senha permanece segura e inalterada.',
      ctaText: 'Redefinir minha senha',
      ctaUrl: link,
      feedbackTitle: 'Precisa de ajuda com a sua conta?',
      feedbackText: 'Se estiver enfrentando dificuldades para acessar o portal ou gerenciar sua empresa, nossa equipe de suporte está à disposição.',
      feedbackButtonText: 'Falar com suporte',
      feedbackUrl: 'https://wa.me/5547997190413'
    });

    try {
      const result = await transport.sendMail({
        from: { name: 'Itapoá Online', address: config.from },
        to,
        subject: 'Redefina sua senha — Itapoá Online',
        text,
        html,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!result.accepted?.length || result.rejected?.length) throw new Error('RECOVERY_SMTP_REJECTED');
      return { messageId: typeof result.messageId === 'string' ? result.messageId : undefined };
    } finally {
      transport.close();
    }
  },
};

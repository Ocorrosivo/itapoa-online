import { mailConfig, createMailTransport } from './mailService.js';

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
      return { messageId: typeof result.messageId === 'string' ? result.messageId : undefined };
    } finally { transport.close(); }
  },
};

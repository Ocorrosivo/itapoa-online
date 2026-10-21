import { mailService, mailConfig } from '../src/server/services/mailService.js';

async function main() {
  console.log('==================================================');
  console.log('Envio de Teste Real Autorizado — Itapoá Online');
  console.log('Destinatário:', 'suprememidias.ok@gmail.com');
  console.log('Remetente:', 'contato@itapoa.online');
  console.log('==================================================');

  const config = mailConfig();
  if (!config) {
    console.error('ERRO: Configuração SMTP ausente no ambiente atual.');
    console.error('Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD/SMTP_PASS no ambiente.');
    process.exit(1);
  }

  console.log(`Conectando ao SMTP: ${config.host}:${config.port} como ${config.user}...`);
  const result = await mailService.sendAuthorizedTest();
  console.log('Resultado do envio:');
  console.log('  Status aceito pelo servidor:', result.accepted ? 'SIM (250 OK)' : 'NÃO');
  console.log('  Message-ID:', result.messageId || 'N/A');
  console.log('  Timestamp UTC:', result.timestamp);
  console.log('==================================================');
}

main().catch((err) => {
  console.error('Falha no envio do e-mail de teste:', err?.message || err);
  process.exit(1);
});

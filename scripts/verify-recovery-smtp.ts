import { recoveryTransport } from '../src/server/services/recoveryMailService.js';

// Run only in the secured application environment. Never prints SMTP errors/secrets.
async function main() {
  const transport = recoveryTransport();
  try {
    await transport.verify();
    console.log('SMTP: conexão e autenticação verificadas. Nenhuma mensagem enviada.');
  } finally { transport.close(); }
}
main().catch(() => {
  console.error('SMTP: verificação falhou. Confira configuração, credenciais, TLS e acesso de rede no ambiente seguro.');
  process.exitCode = 1;
});

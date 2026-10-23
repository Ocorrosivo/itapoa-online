# Recuperação de senha — ativação explícita

O fluxo antigo simulava envio. O novo usa `/esqueci-senha`, API real e
`/redefinir-senha#token=...`. Nunca altera senha apenas ao abrir o link.

## Pré-requisitos de produção

1. Confirmar que `contato@itapoa.online` existe e qual é seu provedor SMTP.
2. Configurar **no serviço da aplicação** no Easypanel, não no Git:
   `SMTP_HOST`, `SMTP_PORT` (465 TLS ou 587 STARTTLS), `SMTP_USER`,
   `SMTP_PASSWORD` (alias `SMTP_PASS`) e `SMTP_FROM=contato@itapoa.online`.
   `SMTP_FROM` deve ser apenas o endereço. `APP_URL=https://itapoa.online`.
   Confirmação de cadastro e recuperação usam a mesma configuração e transporte.
   Aliases aceitos: `SMTP_USERNAME`, `SMTP_PASS`, `EMAIL_FROM`. Não há provedor,
   usuário ou remetente presumidos pelo código.
   Não desabilitar a validação do certificado TLS. Confirmar SPF/DKIM/DMARC
   pelos valores oficiais do provedor; não substituir registros DNS existentes.
3. Obter autorização separada e backup do banco; então aplicar somente
   `database/migrations/20261021_password_recovery.sql`. Não reimportar schema
   completo ou seeds. As duas novas tabelas são aditivas e a migração é repetível.
4. Validar lint, build e testes. Publicar apenas com autorização, pelo procedimento
   de `DEPLOY_VPS.md`. A publicação não aplica SQL nem altera SMTP automaticamente.

Sem SMTP ou tabelas, a recuperação fica indisponível, mas login/catálogo continuam
funcionando. `/api/auth/recovery-status` verifica presença de configuração e
acesso às tabelas; **não garante autenticação SMTP nem entrega na caixa postal**.

## Validação

- Testes sem rede externa: `node --import tsx --test tests/unit/password-recovery.test.ts`.
- Após build: `npx playwright test tests/e2e/password-recovery.spec.ts`.
  O navegador usa API simulada, sem e-mails ou senhas de usuários reais.
- Com SMTP configurado, executar `node --import tsx scripts/verify-recovery-smtp.ts`
  dentro do ambiente seguro da aplicação. Verifica conexão/autenticação, não envia.
- Com consentimento do destinatário, solicitar uma única recuperação pelo site;
  conferir recebimento (incluindo spam), remetente e domínio do link. Não registrar
  nem compartilhar o link. Não consumir link de administrador para testar troca
  sem consentimento adicional; usar conta de teste controlada para teste completo.
- Na conta de teste: redefinir, tentar reutilizar link (deve falhar), conferir login
  com nova senha e rejeição da antiga/sessões anteriores. Link expira em 15 minutos.
- Confirmar Actions, health HTTP 200/banco conectado e `X-Release-Sha` correto.

## Segurança e operação

Resposta idêntica para conta existente/inexistente. Limites por IP e HMAC do e-mail,
cooldown de 60 segundos no banco, um token ativo por usuário. Token aleatório de
256 bits; somente SHA-256 e impressão HMAC da senha atual ficam no banco. Transação
com bloqueio de linha garante uso único, atualização da senha e revogação dos JWTs
antigos. A mudança normal de senha também invalida links pendentes pela impressão.
Senhas novas usam bcrypt com custo 12, mínimo 8 caracteres e máximo 72 bytes.

O token fica no fragmento (não enviado em GET) e é removido da URL pelo cliente.
Respostas de recuperação não são armazenáveis; política de referência é no-referrer.
Nenhum token/senha/erro SMTP bruto é escrito nos logs. Erros de entrega geram apenas
`[password-recovery] delivery_failed`, correlationId e código SMTP sanitizado,
sem destinatário, erro bruto ou link. A resposta genérica de solicitação inclui
um correlationId em todos os casos; ele permite consultar logs protegidos sem
revelar existência de conta. `delivery_accepted` registra somente correlationId,
horário e MessageId seguro após aceitação SMTP, sem comprovar recebimento no Gmail.

`user_auth_state` é obrigatória para autenticação: falhas de consulta não retornam
versão zero nem revalidam sessões revogadas. O deploy confere essa tabela sem DDL.
O limite de dez solicitações em preparação/entrega é reservado antes dos awaits.
Troca autenticada e redefinição de senha usam o mesmo lock de usuário e revogam
as sessões na mesma transação; o usuário deverá entrar novamente após a troca.

O envio é assíncrono no processo, não uma fila durável: reiniciar o container nesse
intervalo pode perder o envio; o usuário deve solicitar outro link após um minuto.
Falhas SMTP apagam apenas o token correspondente, permitindo nova tentativa.
HTTP 202 confirma solicitação, nunca entrega. Limites em memória não são globais
entre réplicas; complementar com limites no proxy/WAF. Não confiar em X-Forwarded-For
arbitrário; atrás de proxy o limite de IP pode ser compartilhado.

Não remover `user_auth_state` após uso: isso poderia revalidar sessões antigas.
Em rollback do código, manter tabelas e dados; uma versão antiga sem a validação de
sessões perde a garantia de revogação. Preservar volumes, JWT_SECRET e demais envs.

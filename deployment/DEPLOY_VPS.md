# Deploy único — itapoa.online

Produção: https://itapoa.online. `itapoa.tech` é somente o painel Easypanel.

## Claude e Codex

1. Revisar alterações em branch atualizada; branches/worktrees do Claude não são publicadas sozinhas.
2. Executar `npm run lint`, `npm run build` e os testes pertinentes.
3. Quando autorizado, integrar na `main` e enviar ao GitHub.
4. Acompanhar **Deploy Easypanel (itapoa.online)** até concluir.
5. Confirmar `/api/health` HTTP 200, banco conectado e `X-Release-Sha` igual ao commit publicado.

Commit local e push em outra branch não publicam. Não juntar todas as branches antigas indiscriminadamente.

## Automação

`.github/workflows/deploy-easypanel.yml`: push main → instalação → lint/build → SSH → build Docker do SHA exato → atualização → health no container → health público/SHA → frontend público.

- Serviço: `itapoa_itapoa-app`; imagem: `easypanel/itapoa/itapoa-app:<SHA>`.
- Node 20; entrada `node dist/server.cjs`.
- Secrets GitHub: `VPS_HOST`, `VPS_USER`, `VPS_PASSWORD`, `VPS_PORT`.
- A porta 3000 do host pode ser do painel. Verificar a aplicação dentro do container correto.
- Falha após início da atualização tenta restaurar a imagem anterior. Conferir o serviço após falhas, pois a reversão também pode falhar.
- Deploys são serializados e usam o SHA do evento, não a ponta móvel da main.

Não usar scripts Hostinger/FTP, PM2/Caddy ou workflows em `workflows/disabled` para publicar.

## Dados e recuperação

### Checkout minimalista e credenciais de pagamento

O novo fluxo usa `/planos` → `/checkout` (página própria), com nome, telefone e e-mail. A conta autenticada continua obrigatória para vincular a compra com segurança. Dados comerciais são completados no painel; cadastros `checkout_...` sem categoria/cidade não aparecem no catálogo público.

Configurar no ambiente **do serviço da aplicação** no Easypanel, sem enviar chaves no chat nem versioná-las:

```text
MERCADOPAGO_PUBLIC_KEY=<public-key-da-aplicacao>
MERCADOPAGO_ACCESS_TOKEN=<access-token-da-mesma-aplicacao>
MERCADOPAGO_WEBHOOK_SECRET=<segredo-de-assinatura-do-webhook>
```

Notificação de pagamento: `https://itapoa.online/api/webhooks/mercadopago`. Public Key e Access Token precisam corresponder à mesma aplicação/ambiente. Em produção, o novo checkout não libera cobranças sem Access Token e configuração de webhook. O endpoint `/api/payments/config` expõe somente Public Key e disponibilidade calculada pela presença da configuração; **não prova validade das credenciais**.

Cartão utiliza Card Payment Brick do SDK oficial, que fornece um token; número e CVV não passam pelo backend da aplicação. Preço é obtido do banco no servidor. Resposta aprovada do gateway não ativa o plano: a confirmação continua dependente de webhook verificado.

Antes de habilitar em produção: testar com credenciais/cartões de teste da aplicação, verificar assinatura e entrega do webhook e confirmar a ativação. Os testes locais de interface usam SDK/API simulados e não substituem esse teste integrado. Não reutilizar credenciais recuperadas de históricos; o responsável optou por configurar as chaves atuais diretamente na VPS.

O deploy troca apenas a imagem e preserva as variáveis e volumes configurados no serviço. `APP_URL=https://itapoa.online` e `API_URL=https://itapoa.online/api`. Segredos permanecem no Easypanel, nunca no Git. Uploads precisam de volume persistente e `UPLOAD_DIR` correspondente.

Não reimportar seeds nem executar migrações no deploy. Mudanças de banco exigem autorização e backup separados.

### Manutenção autorizada do banco de pagamentos

O workflow manual `payment-db-maintenance.yml` inspeciona sem escrever por padrão.
Somente após autorização explícita, executar com `confirmation=backup-and-migrate-itapoa`.
Ele usa o banco interno identificado pelo serviço atual, salva dump consistente e
configuração do serviço em `/var/backups/itapoa/payment-<UTC>-<run-id>` (diretório
700, arquivos 600), confere SHA-256, restaura em container sem rede/portas/volumes
de produção e compara os dados. A migração é testada duas vezes nessa cópia.
O container de teste é descartado; o backup privado é preservado na VPS.
Não publicar dumps ou a configuração do serviço como artifacts do GitHub.

`20261022_payment_production_prerequisites.sql` contém somente os pré-requisitos
aditivos de pagamentos ausentes no banco legado (dez colunas e três tabelas).
Não executa seeds, DML, alteração de preços, senha master ou status financeiros.
Compara hashes dos valores de todas as colunas preexistentes antes/depois.
Essa rotina é separada do deploy e não é executada por push.
Não restaurar o dump sobre produção após novas vendas sem análise e autorização.

Recuperação real de senha: seguir `deployment/PASSWORD_RECOVERY.md`. SMTP e a migração
aditiva exigem ativação explícita; não são configurados como efeito colateral do deploy.

Para recuperar código, preferir `git revert <commit>` revisado e novo push, ou restaurar a imagem conhecida no Easypanel. Não resetar/force-push, recriar o serviço ou apagar volumes.

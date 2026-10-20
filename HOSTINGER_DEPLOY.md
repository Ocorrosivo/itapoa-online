# Guia de Implantação

> DOCUMENTO LEGADO: os detalhes de PM2/Caddy e workflows abaixo estão desatualizados. Para a publicação atual, seguir exclusivamente `deployment/DEPLOY_VPS.md`: VPS Docker/Easypanel, domínio itapoa.online, workflow deploy-easypanel.yml. Não executar os procedimentos antigos de recuperação/publicação deste documento.

Produção pública: **https://itapoa.online** (site, checkout e API).
Easypanel: **https://itapoa.tech** (painel de infraestrutura — não hospeda a aplicação).

**Infraestrutura real verificada (2026-10-20):**

- `itapoa.online` e `itapoa.tech` resolvem para o mesmo IP `2.24.209.225` (VPS único)
- `https://itapoa.online/api/health` → `200 {"status":"ok","database":"connected"}` (app itapoa-online)
- `https://itapoa.tech/api/health` → `404 {"error":"Not found"}` (serve apenas o frontend estático do Easypanel)
- `https://itapoa.online/api/plans` e `/api/companies` retornam o catálogo real em produção
- `https://itapoa.tech/` serve HTML do **Easypanel** (título "Easypanel"), não o app
- Caddy no VPS faz `reverse_proxy 127.0.0.1:3000` para ambos os domínios, mas apenas `itapoa.online` é o destino canônico da aplicação — `itapoa.tech` NÃO deve ser usado como URL do app, API ou webhook. Easypanel tem seu próprio serviço na porta separada.

**Conclusão:** há **um único servidor de aplicação** (PM2 `itapoa` → `dist/server.cjs` em `/opt/itapoa/app`). O Easypanel em `itapoa.tech` é o painel de gerenciamento do VPS, não um segundo deploy do itapoa-online. O workflow `deploy-vps.yml` já publica corretamente no VPS que atende `itapoa.online` via `appleboy/ssh-action` → `/opt/itapoa/app`. Não há deploy concorrente para corrigir; apenas foi ajustado o fallback `pm2 start` e o `caddy reload` no workflow para evitar falha quando o processo ainda não existe, e o health check passou a validar `https://itapoa.online` (não `itapoa.tech`).

Webhook do Mercado Pago (confirmado em `server.ts`):

```
POST https://itapoa.online/api/webhooks/mercadopago
```

Registre exatamente esta URL no painel do Mercado Pago e copie o webhook secret
para `MERCADOPAGO_WEBHOOK_SECRET`. `APP_URL` deve ser `https://itapoa.online`
(ou o domínio público real) para que `notification_url` e `back_urls` do
Checkout Pro sejam corretos. Não use `ajborrachariamovel.com.br` neste projeto.
Qualquer `APP_URL` com prefixo duplicado (`https://https://`) quebra as URLs do checkout.

## Fluxo vigente de deploy

O deploy produtivo é pelo workflow **Deploy VPS (itapoa.tech)** em
`.github/workflows/deploy-vps.yml`:

`push → main → lint → build → ssh (git fetch + reset, npm ci, build, pm2 restart, caddy reload) → health check`

O script legado `scripts/hostinger-deploy.mjs` (Hostinger API) não é usado para
publicar. Não sobrescreva a configuração do Easypanel com o workflow/arquivo
antigo de PM2.

## Requisitos

- **Node.js:** >= 20.0.0
- **Banco:** MySQL/MariaDB — fonte única `database/schema/MYSQL_SCHEMA.sql` (InnoDB, 37 tabelas).
- **Armazenamento:** acesso local à pasta de projeto, com leitura/escrita em `uploads`.

## Banco de dados

No painel do banco (phpMyAdmin / Hostinger / Easypanel MySQL), importe **na ordem**:

1. `database/schema/MYSQL_SCHEMA.sql` — estrutura
2. `database/schema/SEED.sql` — papéis, admin master e planos
3. `database/schema/SEED_DEMO.sql` — catálogo demo (cidades/bairros/categorias/empresas) — sem ele a busca retorna vazia

> SEED.sql é obrigatório: `users` referencia `roles`; sem ele todo cadastro falha.
> Ele cria `admin@itapoa.online` com senha inicial aleatória — troque após o primeiro login.

## Variáveis de ambiente

### Produção pública (VPS — `itapoa.online`)

```text
NODE_ENV=production
PORT=3000
APP_URL=https://itapoa.online
API_URL=https://itapoa.online/api
DB_HOST=srv887.hstgr.io
DB_PORT=3306
DB_NAME=<seu-banco>
DB_USER=<seu-user>
DB_PASSWORD=<sua-senha>
JWT_SECRET=<hash-longo-e-seguro-min-32-caracteres>

# Pagamentos (Mercado Pago) — necessários para cobranças reais
# APP_USR- é produção (Orders/Checkout Pro); TEST- é Checkout API/Bricks — ambos válidos.
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx
MERCADOPAGO_WEBHOOK_SECRET=<segredo-do-webhook-do-painel-mp>

# Opcional: caminho absoluto persistente para uploads (recomendado, sobrevive a redeploys)
# UPLOAD_DIR=/home/uXXXX/uploads
```

> Pagamentos: sem `MERCADOPAGO_ACCESS_TOKEN`, os endpoints de cobrança
> retornam `503` (o resto do site funciona). A ativação da assinatura acontece
> apenas via webhook verificado — nunca pelo frontend.

### Easypanel (itapoa.tech)

O painel em `https://itapoa.tech` é o **painel de gerenciamento do VPS** (Easypanel), não a aplicação itapoa-online. Não publique o app em `itapoa.tech/api`.

## Aplicação Node.js

- **Startup file:** `dist/server.cjs` (gerado por `npm run build`).
- **Porta:** gerenciada por `process.env.PORT`.

## Verificação

- `GET https://itapoa.online/api/health` → `{"status":"ok","database":"connected"}` (HTTP 200)
- `POST https://itapoa.online/api/webhooks/mercadopago` → sempre `200 {received:true}` (assinatura é validada dentro do handler)
- `node scripts/smoke-catalog.mjs` — valida buscas no banco configurado
- `node scripts/smoke-catalog.mjs --offline` — verifica retorno 503 sem crash

## Notas

- `VITE_SUPABASE_*` no `.env` é legado (suporte removido) e é ignorado pelo deploy.
- Não commitar `.env` nem segredos; variáveis reais ficam no painel do Easypanel/VPS.
- Build/Start: `npm run lint` → `npm run build` → `npm start` (`node dist/server.cjs`).

## Recuperação

- **Código:** `git revert <commit>` ou `git reset --hard origin/main~1` + push com proteção; o workflow republica automaticamente.
- **Configuração:** `.env` em `/opt/itapoa/app/.env` não é versionado — restaurar via backup do Easypanel/VPS ou recriar a partir de `.env.example` com os segredos do cofre. Caddyfile em `/etc/caddy/Caddyfile` — backup antes de editar; `caddy reload --config /etc/caddy/Caddyfile` volta atrás com o arquivo anterior.
- **Banco:** dump antes de qualquer migração (`mysqldump --single-transaction`); restauro via `mysql < dump.sql`. Nunca `DROP/TRUNCATE` automático.
- **Uploads:** diretório `uploads/` (ou `UPLOAD_DIR`) — manter backup incremental; redeploy não apaga se `UPLOAD_DIR` for absoluto fora de `/opt/itapoa/app`.

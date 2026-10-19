# Guia de Implantação

Produção pública: **https://itapoa.online** (site, checkout e API).
Painel administrativo: **https://itapoa.tech** (Easypanel — deploy via Git push para `main`).

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

### Produção pública (Easypanel / VPS — `itapoa.online`)

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

O painel em `https://itapoa.tech` já está configurado com Caddy/Node separadamente.
Se as duas origens compartilharem o mesmo servidor/IP, garanta que o Caddy
faz proxy de `Host: itapoa.online` para o mesmo app — não duplique o banco.

## Aplicação Node.js

- **Startup file:** `dist/server.cjs` (gerado por `npm run build`).
- **Porta:** gerenciada por `process.env.PORT`.

## Verificação

- `GET /api/health` → `{"status":"ok","database":"connected"}` (HTTP 200)
- `POST /api/webhooks/mercadopago` → sempre `200 {received:true}` (assinatura é validada dentro do handler)
- `node scripts/smoke-catalog.mjs` — valida buscas no banco configurado
- `node scripts/smoke-catalog.mjs --offline` — verifica retorno 503 sem crash

## Notas

- `VITE_SUPABASE_*` no `.env` é legado (suporte removido) e é ignorado pelo deploy.
- Não commitar `.env` nem segredos; variáveis reais ficam no painel do Easypanel/VPS.
- Build/Start: `npm run lint` → `npm run build` → `npm start` (`node dist/server.cjs`).

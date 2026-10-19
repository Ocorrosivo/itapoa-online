# 🚀 Guia de Implantação — VPS (itapoa.tech)

**Produção:** `https://itapoa.tech` (VPS `2.24.209.225` / `srv2075519.hstgr.cloud`, Ubuntu 26.04, Caddy → `127.0.0.1:3000`).
Domínios `itapoa.tech` e `www.itapoa.tech` no mesmo app; `:80` redireciona para https automaticamente.

## Fluxo automático (sem entrar na VPS)

Todo **`push` na `main`** e todo **merge de PR para `main`** dispara `Deploy VPS (itapoa.tech)` (`.github/workflows/deploy-vps.yml`).
Também pode rodar manual: GitHub → Actions → *Deploy VPS (itapoa.tech)* → *Run workflow* (`main`).

- **Concorrência:** `cancel-in-progress: true` — uma publicação antiga é cancelada quando uma mais nova entra.
- **Sem SSO manual:** Não mexa na VPS por `ssh`/`Web console` para deploy — o workflow faz `git fetch` + `reset --hard origin/main` + `npm ci` + `npm run build` + `pm2 restart` + `caddy reload` no alvo.

## O que o pipeline faz (e como falha de forma explícita)

1. `npm ci` → `npm run lint` (`tsc --noEmit`) → `npm run build` (`vite build && esbuild → dist/server.cjs`).
2. Valida `dist/index.html` e `dist/server.cjs` (se faltar, **ERRO** e `exit 1`).
3. Conecta na VPS via `appleboy/ssh-action` com Secrets `VPS_HOST / VPS_USER / VPS_PASSWORD / VPS_PORT / VPS_APP_DIR` (padrão `APP_DIR=/opt/itapoa/app`). Faz `git reset --hard origin/main`, `npm ci`, `build`, `pm2 restart itapoa`, `caddy reload`, e `curl 127.0.0.1:3000/api/health` (se SSH/restart falhar, **ERRO**).
4. Verifica externamente `https://itapoa.tech/api/health` (espera `200` com `"status"`), `https://itapoa.tech/projetos-sociais` e `https://itapoa.tech/` (`200` — SPA fallback). **Se qualquer verificação falhar, o workflow falha explicitamente.**

## Secrets (GitHub → Settings → Secrets → Actions)

| Secret | Valor esperado |
|---|---|
| `VPS_HOST` | `2.24.209.225` |
| `VPS_USER` | `root` (ou usuário deploy dedicado) |
| `VPS_PASSWORD` | senha SSH do usuário — **nunca no repo** |
| `VPS_PORT` | `22` |
| `VPS_APP_DIR` | `/opt/itapoa/app` (ajustar se o app estiver em outro caminho) |

> Sem esses Secrets o build/lint passa, mas a etapa SSH/Health **falha com ERRO** — não há “sucesso falso”.

## Variáveis de ambiente (VPS — não versionadas)

Defina no serviço/pm2/systemd/env do app na VPS (não commitar). Para `itapoa.tech`:

```text
NODE_ENV=production
PORT=3000
APP_URL=https://itapoa.tech
API_URL=https://itapoa.tech/api
DB_HOST=srv...hstgr.io
DB_PORT=3306
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=... # >= 32 caracteres
UPLOAD_DIR=/home/.../uploads  # absoluto, fora de dist/
MERCADOPAGO_ACCESS_TOKEN=APP_USR-... # opcional; sem ele, cobrança 503, site ok
MERCADOPAGO_WEBHOOK_SECRET=...       # webhook: https://itapoa.tech/api/webhooks/mercadopago
```

## Banco e artefatos persistentes

- **Estrutura:** `database/schema/MYSQL_SCHEMA.sql` é a fonte única. Na primeira carga: `MYSQL_SCHEMA.sql` → `SEED.sql` → `SEED_DEMO.sql`. **Nunca `DROP/TRUNCATE` automático**; o servidor só reporta estado (`reportSchemaState`).
- **Preservados entre deploys:** MySQL, `uploads` (`UPLOAD_DIR`), env, certificados Caddy. O deploy sobrescreve código (`git reset`) e `dist/`, não apaga dados.

## Rollback / recuperação

- Cada merge gera um commit em `main`. Para voltar: `git revert <sha>` + `push` em `main` — o próximo push publica o rollback automaticamente.
- Na VPS: `pm2 logs itapoa` e `curl https://itapoa.tech/api/health` diagnosticam. O workflow já valida esses endpoints.

## Validação local antes de publicar

```bash
npm run lint
npm run build
test -f dist/index.html && test -f dist/server.cjs && echo ok
curl -s https://itapoa.tech/api/health | head -c 200
```

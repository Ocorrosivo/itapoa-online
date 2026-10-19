# 🚀 Guia de Implantação — Hostinger VPS (itapoa.tech)

**Produção:** `https://itapoa.tech` (VPS `2.24.209.225` / `srv2075519.hstgr.cloud`, Ubuntu 26.04, Caddy em frente ao Node).
Domínio legado `ajborrachariamovel.com.br` permanece referência antiga quando citado.

## Fluxo final (não entrar na VPS manualmente)

1. **Merge/PR na `main` dispara publicação automática.** Todo `push` em `main` e todo **merge de PR** para `main` roda o workflow `Deploy Hostinger` (`.github/workflows/deploy-hostinger.yml`).
2. **Execução manual:** GitHub → Actions → *Deploy Hostinger* → *Run workflow* (mesma branch = `main`).
3. **Concorrência:** `cancel-in-progress: true` — uma publicação em andamento é cancelada quando uma mais nova entra, evitando versión antiga sobrescrever a nova.

## O que o deploy faz

- `npm ci` → `npm run lint` (`tsc --noEmit`) → `npm run build` (`vite build && esbuild server.ts → dist/server.cjs`).
- Valida artefatos `dist/index.html` e `dist/server.cjs` e imprime o commit (`git rev-parse --short HEAD`).
- Publica `dist/*` na VPS via SCP usando os Secrets `HOSTINGER_HOST / HOSTINGER_USER / HOSTINGER_SSH_PASSWORD / HOSTINGER_PORT / HOSTINGER_TARGET`.
- Reinicia o app: tenta `pm2 restart/reload` quando disponível e, quando aplicável, `touch tmp/restart.txt` (Passenger).
- Verifica em `https://itapoa.tech`: `/api/health` deve ser `200 {"status":"...","database":"..."}`, `/projetos-sociais` e `/` devem ser `200` (SPA fallback). **Se qualquer verificação falhar, o workflow falha explicitamente.**

## Secrets necessários (GitHub → Settings → Secrets → Actions)

| Secret | Exemplo/Nota |
|---|---|
| `HOSTINGER_HOST` | `2.24.209.225` |
| `HOSTINGER_USER` | `root` (ou usuário deploy dedicado) |
| `HOSTINGER_SSH_PASSWORD` | senha SSH do usuário acima — **nunca no repo** |
| `HOSTINGER_PORT` | `22` (ou porta custom) |
| `HOSTINGER_TARGET` | caminho absoluto do app na VPS, ex. `/var/www/itapoa.tech` ou `/root/itapoa-online` — confirme com `pwd` + `pm2 list` na VPS |

> Sem esses Secrets o workflow faz build/lint/build corretamente, mas **falha ao publicar** com mensagem clara (não é “sucesso falso”).

## Variáveis de ambiente na VPS (não versionadas)

Estão no painel/serviço da VPS (pm2 env, systemd, Caddy env ou arquivo `.env` no alvo — **não commitar**). Para `itapoa.tech`:

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
MERCADOPAGO_ACCESS_TOKEN=APP_USR-... # opcional; sem ele, cobrança retorna 503, site segue ok
MERCADOPAGO_WEBHOOK_SECRET=...       # webhook: https://itapoa.tech/api/webhooks/mercadopago
```

## Banco e artefatos persistentes

- **Estrutura é `database/schema/MYSQL_SCHEMA.sql`** (fonte única). Ordem de import na primeira carga:
  1. `MYSQL_SCHEMA.sql`  2. `SEED.sql`  3. `SEED_DEMO.sql`.
  Não re-executar sem necessidade; **nunca `DROP/TRUNCATE` automático**. O servidor nunca migra sozinho (`reportSchemaState` só loga).
- **Preservados entre deploys:** banco MySQL, `uploads` (`UPLOAD_DIR`), `.env`/variáveis, certificados Caddy. O deploy só sobrescreve `dist/`.

## Recuperação / rollback

- **Cada merge é um commit na `main`.** Para voltar, reverta o commit (ou faça `git revert <sha>` e `push` em `main`) — o próximo push publica o rollback automaticamente.
- Na VPS, mantenha `pm2` ou o gerenciamento do painel ativo; se o app não subir, `pm2 logs` e `curl https://itapoa.tech/api/health` indicam a causa. O workflow já valida esses endpoints.

## Verificação local antes de publicar

```bash
npm run lint
npm run build
test -f dist/index.html && test -f dist/server.cjs && echo ok
```

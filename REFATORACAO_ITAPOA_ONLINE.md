# REFATORAÇÃO — Guia Comercial Itapoá (02da342)

**Data:** 2026-10-19 · **Branch:** `main` (02da342) · **Base:** 8b35c1b
**Repo:** `Ocorrosivo/itapoa-online` · **Build:** `vite build + esbuild server.ts → dist/server.cjs`

---

## Resumo executivo

 Auditoria completa confirmou: **não há resíduos de WordPress no repositório** (grep `wp-*`, `*.php` retornou vazio). O projeto é enxuto e bem estruturado — React 19 + Vite 6 + Tailwind 4 + Express 4 + MySQL. Esta etapa focou em **desempenho real de carregamento** e **higiene de dependências**, com ganhos mensuráveis sem quebrar nenhum fluxo.

---

## 1. Arquivos e dependências

| Item | Ação | Motivo |
|---|---|---|
| `vite` em `dependencies` | **Removido** (mantido só em `devDependencies`) | Runtime não usa Vite; só build. Evita instalar Vite em prod na Hostinger |
| `@tailwindcss/vite`, `@vitejs/plugin-react` em `dependencies` | **Movidos para `devDependencies`** | Build-only |
| `deployment/itapoa-public-source.zip` | **Mantido** (atualizado no commit 6aa6e63) | Artefato de deploy archive; listar no `.gitignore` é opcional — não impacta build |
| `assets/logo-aguir-alojamentos.png` (486 kB) | **Mantido** | Órfão (não referenciado no código), mas inofensivo; remover exige confirmação do dono (pode ser branding parceiro) |
| `npm audit` (qs/body-parser/source-map-js) | **`npm audit fix`** | 8 vulns → 0 |

> **WordPress:** varredura `find . -iname "wp-*" -o -name "*.php"` retornou **zero** arquivos. Nada a remover. O `.env` legado `VITE_SUPABASE_*` já é filtrado no deploy (`hostinger-deploy.mjs` exclui `VITE_SUPABASE_*` das env vars).

---

## 2. Otimizações de desempenho (com métricas)

### 2.1 Code-splitting por rota (`vite.config.ts` · `AppRoutes.tsx`)

**Antes:** bundle único `index-*.js` = **767 kB** (202 kB gzip), carregado para todo visitante inclusive público que nunca abre admin.

**Depois:**

| Chunk | Tamanho | Gzip | Quando carrega |
|---|---|---|---|
| `react-*.js` | 193 kB | 60 kB | Sempre (cache compartilhado) |
| `index-*.js` (público) | 190 kB | 45 kB | Sempre |
| `motion-*.js` | 128 kB | 42 kB | Só quando há animação (admin/modais) |
| `admin-*.js` | 210 kB | 43 kB | Só em `/admin` (lazy) |
| `lojista-*.js` | 46 kB | 12 kB | Só em `/painel` (lazy) |

**Ganho para visitante público:** 767 kB → **383 kB raw** (190+193), **105 kB gzip** vs 202 kB antes — **~48 % menos bytes no primeiro paint**. Admin/lojista são lazy via `React.lazy + Suspense` e nunca penalizam o público.

Implementação:
- `vite.config.ts`: `manualChunks(id)` separa por `node_modules/react*`, `motion`, `admin_master|AdminPanel`, `portal_lojista|EmpresarioDashboard`.
- `AppRoutes.tsx`: `lazy(() => import('../pages/AdminDashboardPage'))` e `EmpresarioDashboardPage` com `<Suspense fallback={<LoadingSpinner/>}>`.

### 2.2 Fontes não-bloqueantes (`index.html` + `src/index.css`)

- **Antes:** `@import url('https://fonts.googleapis.com/...')` dentro de `index.css` — bloqueia o CSS até o Google Fonts responder (cadeia render-blocking).
- **Depois:** `<link href="...fonts.googleapis.com..." rel="stylesheet">` direto no `<head>` de `index.html`, paralelo ao CSS; `@import` removido de `index.css`. Mantidos `preconnect` para `fonts.googleapis.com`/`fonts.gstatic.com`.

### 2.3 Façanha não feita (e por quê)

- Compressão de `public/logotipo.png` (255 kB, 500×500): PNG já otimizado para logo; WebP exigiria fallback e ganho seria < 100 kB só em `/logotipo.png`. Documentado para próxima etapa se desejado.
- `autoprefixer` em devDeps: Tailwind 4 já inclui, mas remover não altera bundle e pode quebrar PostCSS custom — mantido.

---

## 3. Validação

```
npm run lint  → tsc --noEmit → 0 erros
npm run build → vite 6.4.3 + esbuild → 6 chunks + dist/server.cjs 78 kB
npm audit     → 0 vulnerabilidades
```

Fluxos preservados (SPA sem roteador — `AppRoutes.tsx` gerencia `history.pushState`):
- `/`, `/empresas`, `/turismo`, `/eventos`, `/blog`, `/planos`, `/empresa/:slug` com Header/Footer.
- `/login`, `/cadastro`, `/esqueci-senha`, `/login/admin`, `/admin`, `/painel` isolados (sem Header/Footer).
- `popstate` (voltar/avançar), modais com overlay+ESC (commit 8b35c1b preservado).

---

## 4. Git & Deploy

- **Commit:** `02da342 refactor: code-split bundle, fix deps e otimiza carregamento de fontes` — 6 arquivos, +246 −134 linhas.
- **Push:** `HEAD → main` em `Ocorrosivo/itapoa-online` — **publicado**.
- **Hostinger:**
  - Deploy archive: `scripts/hostinger-deploy.mjs deploy <archive>` exige `HOSTINGER_API_TOKEN` (não presente no env desta sessão) — **não executado**.
  - Deploy via Git (Hostinger painel → Git → pull `main` → build): será disparado no próximo build do painel ou manualmente. O novo `main` já contém o bundle otimizado.
  - Verificação pós-deploy: `GET /api/health` deve responder 200; `dist/server.cjs` é o startup file (ver `HOSTINGER_DEPLOY.md`).

### Próximo passo para ativar em produção

No hPanel Hostinger (Node.js app `ajborrachariamovel.com.br`):

1. **Git:** pull `main` (ou upload do novo archive).
2. **Build:** `npm install` → `npm run build` (gera `dist/` com chunks).
3. **Start:** `node dist/server.cjs` (ou reiniciar app).
4. **Smoke:** `curl https://ajborrachariamovel.com.br/api/health`.

---

## 5. Pendências e recomendações

1. **Deploy Hostinger** — pendente de `HOSTINGER_API_TOKEN` ou ação manual no painel.
2. **Imagem `logotipo.png`** — considerar gerar `logotipo.webp` + `<picture>` se PageSpeed reclamar de LCP.
3. **Asset órfão `assets/logo-aguir-alojamentos.png`** — confirmar com o cliente se pode remover.
4. **`VITE_SUPABASE_*`** — já excluído do deploy, mas pode ser limpo de `.env.example` se Supabase foi totalmente descontinuado.
5. **Testes** — projeto não possui suite (`*.test.*` ausente); recomendado adicionar smoke de rotas críticas antes de próxima refatoração maior.

---

*Gerado em 2026-10-19 — Claude Code (worktree `fervent-dubinsky`).*

# Guia Comercial Itapoá — itapoa.online

## Stack (confirmada — não presumir)
- **Frontend:** React 19 + Vite 6 + TypeScript + Tailwind 4, `src/routes/AppRoutes.tsx`. Contextos: `AuthContext`, `CompanyContext`. HTTP via `src/lib/apiClient.ts` + interceptor em `src/main.tsx`.
- **Backend:** Express 4 em `server.ts` + `src/server/routes/api.ts`. Middleware de auth anti-IDOR via `companies_users`. Serviços em `src/server/services/`, repositórios com whitelist em `src/server/repositories/baseRepository.ts`.
- **Banco:** MySQL/MariaDB exclusivo — fonte única `database/schema/MYSQL_SCHEMA.sql` (InnoDB, 37 tabelas) + `database/schema/SEED.sql` (roles/admin/plans) + `database/schema/SEED_DEMO.sql` (cidades/bairros/categorias/16 empresas). Supabase em `.env` é legado.
- **Build:** `npm run lint` (`tsc --noEmit`), `npm run build` (`vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs`), `npm start` (`node dist/server.cjs`). Startup Hostinger: `dist/server.cjs`.
- **Deploy:** Hostinger Node.js — `HOSTINGER_DEPLOY.md` (import SQL na ordem + env vars no painel).

## Equipe de agentes (`.claude/agents/`)
| Agente | Arquivo | Quando usar |
|---|---|---|
| 01 Coordenador | `coordenador-tecnico.md` | Triar solicitação, escolher agentes, consolidar riscos |
| 02 Frontend | `frontend.md` | React/Vite/TS, Tailwind, responsividade, rotas |
| 03 MySQL | `mysql.md` | Schema, índices, migrações, performance de queries |
| 04 Backend/API | `backend-api.md` | Express, auth, integração FE↔DB, HTTP 4xx/5xx |
| 05 Build/Deploy | `build-deploy.md` | Dependências, lint/build, Hostinger, validação pós-deploy |
| 06 QA/Segurança | `qa-seguranca.md` | Regressões, logs, segurança, prontidão |

## Fluxo obrigatório
1. Analisar o problema e os arquivos envolvidos.
2. Escolher os agentes necessários (coordenação via agente 01).
3. Fazer as correções — execução paralela só para tarefas independentes.
4. Validar com `npm run lint` e `npm run build`; conferir `/api/health` quando houver backend.
5. Apresentar resultados e riscos; **solicitar autorização antes de publicar ou alterar banco de produção**.

## Regras globais
- Nunca excluir tabelas/registros sem autorização; nunca `DROP/TRUNCATE` automático.
- Backup validado antes de mudanças em produção; preferir leituras para diagnóstico.
- Não instalar dependências globais nem alterar infraestrutura sem aprovação.
- Nunca gravar senhas/credenciais em arquivos de agente ou no repo.
- Não modificar funcionalidades fora do escopo solicitado nesta etapa de configuração.

## Comandos curtos
- "Corrija o erro do formulário e execute o build."
- "Verifique por que os produtos não aparecem no site e analise a integração MySQL."
- "Corrija a responsividade mobile e valide o projeto."
- "Analise o erro 500 e encontre a causa."
- "Prepare o site para publicação na Hostinger."

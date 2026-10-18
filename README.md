# Itapoá Online

Portal comercial full-stack com React, Vite, Express e MySQL.

## Desenvolvimento local

1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Copie `.env.example` para `.env` e configure MySQL e `JWT_SECRET`.
4. Importe `database/schema/MYSQL_SCHEMA.sql`, depois `database/schema/SEED.sql` e por fim `database/schema/SEED_DEMO.sql` (para carregar o catálogo de empresas e bairros de Itapoá).
5. Execute `npm run dev`.

## Produção

- Verificação de tipos: `npm run lint`
- Build: `npm run build`
- Inicialização: `npm start`
- Entrada gerada: `dist/server.cjs`

Na Hostinger, use uma aplicação Node.js/Express em plano Business, Cloud ou VPS.
Cadastre segredos no painel de variáveis de ambiente; nunca envie o arquivo `.env`.
Consulte `HOSTINGER_DEPLOY.md` para o checklist completo.

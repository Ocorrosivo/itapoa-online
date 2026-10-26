# Limpeza local — 2026-10-25

Base: e4747e07a1a62e12415ff2d2938f1c9299f61d36. Mudanças anteriores incorporadas por outro commit; não reverter.

- Removido server.js: wrapper legado de uma linha, sem consumidor encontrado; npm start e Docker usam dist/server.cjs. Recuperável pelo Git.
- npm run clean agora usa scripts/clean-build.mjs: remove somente dist, relativo à localização do script, compatível Windows/Linux. Não executado para evitar apagar o build solicitado.
- Contexto Docker exclui caches .agents/.claude-flow/.swarm, documentação, coverage, configuração MCP e workflows. Código e assets públicos preservados.
- .gitignore: eliminadas regras de ambiente redundantes, mantendo .env* e exceção .env.example.
- Scripts operacionais, migrações, testes, worktrees e imagem de parceiro preservados. Ausência de import não prova que um arquivo operacional é inútil.

Validação: lint exit 0; 61 testes unitários passaram, zero falhas/ignorados; git diff --check sem erros. Build exit 0: Vite 2179 módulos/25,20s; dist/server.cjs 206,8kB, esbuild 56ms.

Esta é uma etapa de limpeza, não comprovação de refatoração integral ou de correção das duas falhas anteriores de integração do checkout. Nenhum deploy nesta etapa.

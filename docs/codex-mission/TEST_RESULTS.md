# Resultados — 2026-10-24

## Validação para push — 2026-10-25

Base 48a8e1f + limpeza local + correção da sincronização e escopo dos testes de checkout. Lint/build exit 0; 63 testes unitários e 78 integração passaram (0 fail, 0 skip). Testes de pagamento usam gateway simulado. Teste aguarda empresa no resumo antes de pagar e confere valor no resumo, eliminando corrida e ambiguidade após redesign.

## Limpeza — base e4747e0, 2026-10-25

Lint exit 0; 61 testes unitários passaram, 0 falhas/skip; diff --check sem erros. Build exit 0, Vite 25,20s e esbuild 56ms. Integração checkout não reexecutada nesta etapa.

## Revisão para deploy — 2026-10-25

- Base 4079535: lint e build exit 0. Integração: 78 testes, 76 pass, 2 fail, 0 skip.
- Falha browser oferta: seletor R$1,00 agora encontra dois elementos após redesign.
- Falha browser cartão aprovado: após sucesso visual, snapshot de empresa ainda bronze (esperado gold_vip). Investigar vínculo/ordem/concorrência antes de alterar teste.
- Correções locais posteriores: cancelamento consulta reconciliação e recusa pendente/ativo; busca vazia não cancela estado desconhecido; frontend preserva tentativa quando encerramento falha. Ainda precisam de nova rodada de lint/build/testes.
- AppRoutes.tsx passou a modificado durante execução sem edição deste agente: base concorrente precisa estabilizar.
- origin/main consultada:16c8863. Pipeline 40074361304 sucesso; pipeline 40155468720 de outro SHA falhou por coluna instagram duplicada. Nenhum deploy disparado nesta execução.

## Continuação: persistência

- API + MariaDB isolado: tests/integration/company-profile-persistence.test.ts, 3/3 passaram, zero skips. Inclui gravação/leitura, limpeza explícita, atualização parcial, IDOR, bloqueio de privilégios/URLs perigosas, migração repetida e erro SQL real via trigger no banco descartável.
- npm run lint: exit 0 após alterações de persistência.
- npm run build: exit 0, Vite 20,53s, esbuild 50ms.
- Teste uploads-auth-backend NÃO executado: revisão automática falhou por limite de uso. Não contornar permissão.
- MariaDB local iniciado por esta execução: PID 12996, porta 43316; encerramento ainda pendente.

- git status/branch/log/worktree/stash: executados; main 3e49376, oito arquivos modificados, três stashes. Listagem completa disponível no histórico de ferramentas.
- Checkpoints: ausentes na raiz e nas três worktrees prioritárias.
- Teste cranky: inspeção confirmou falta de => na declaração withRepositoryUpdate. Não executado nem aprovado.
- Teste sweet: import dinâmico ocorre antes do before que configura ambiente. Não prova banco real.
- npm run lint: exit 0.
- npm run build: exit 0 na repetição autorizada; primeira tentativa bloqueada por spawn EPERM. Vite 2179 módulos, 19,98s; servidor esbuild concluído.
- Parser TypeScript no teste cranky após correção de =>: exit 0, syntaxErrors=0. Não comprova persistência real.
- Nenhum envio SMTP, cobrança, migração ou teste visual nesta retomada.


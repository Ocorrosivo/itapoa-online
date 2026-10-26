# Tarefas

Nenhum checkpoint anterior foi encontrado na raiz nem nas três worktrees prioritárias. Nenhuma tarefa foi marcada DONE_VERIFIED por relato histórico.

## GIT: Inventariar e consolidar worktrees

- Estado: IN_PROGRESS; prioridade: P0.
- Dependências: nenhuma.
- Arquivos: Git; três worktrees citadas.
- Aceitação: Comparar patches e preservar alterações; nenhuma integração cega.
- Testes/evidência: Inventário confirmado; patches sociais divergentes e teste com erro sintático em cranky.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Comparar implementações em branch isolada.

## PROFILE: Persistência empresarial e campos do cadastro

- Estado: IN_PROGRESS; prioridade: P0.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: companyService.ts; companyRepository.ts; baseRepository.ts; schema; formulários.
- Aceitação: Gravação/leitura real, parcial, vazio, validação URL, IDOR e erro SQL.
- Testes/evidência: Whitelist atual descarta redes; cranky tem arrow function sem =>; sweet inicializa env no before após import.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Corrigir harness e consolidar migração compatível.
- Atualização: quatro campos sociais consolidados localmente; 3 testes de integração SQL aprovados, lint/build exit 0. Resta auditoria dos demais campos e UI/refresh; não marcar tarefa ampla como concluída.

## UPLOAD: Uploads e isolamento multiempresa

- Estado: TODO; prioridade: P0.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: src/server/routes/uploads.ts; testes uploads.
- Aceitação: Validar conteúdo, autorização, persistência em banco isolado.
- Testes/evidência: Evidência histórica não revalidada nesta retomada.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Executar testes existentes.

## AUTH: SMTP, confirmação, login e recuperação

- Estado: TODO; prioridade: P1.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: src/pages/auth; src/server/services.
- Aceitação: Cadastro confirma email e preserva plano; tokens expiram; envio comprovado.
- Testes/evidência: Alterações locais de UI presentes; fluxo anterior não pode ser assumido vigente.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Comparar código atual e testes; não sobrescrever UI alheia.

## CHECKOUT: Bloqueios, planos e configuração QA

- Estado: TODO; prioridade: P1.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: CheckoutPage.tsx; paymentService.ts; api.ts.
- Aceitação: Preço do servidor; QA restrito Pix1/cartão2,50; sem cobrança real.
- Testes/evidência: Cancelamento local pendente altera status sem consultar gateway.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Revisar cancelamento antes de integrar; preços oficiais não alterados.
- Prioridade atual: usuário solicitou cancelamento após 5 minutos. Backend envia validade de 30 minutos; verificar regra oficial e cancelamento no provedor antes de alterar estado local.

## PAYMENTS: Pix, cartão, webhook, obrigado e painel

- Estado: TODO; prioridade: P1.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: serviços pagamentos; testes integração.
- Aceitação: Idempotência, retomada, ativação autenticada e comprovada; redirect5s.
- Testes/evidência: Não executado nesta retomada.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Testar gateway simulado e banco local.

## SEO: SEO técnico, robots, sitemap, renderização, canonical e 404

- Estado: TODO; prioridade: P2.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: server.ts; useSEO; public.
- Aceitação: HTML e URLs públicas indexáveis; privadas excluídas.
- Testes/evidência: Não auditado nesta retomada.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Localizar implementação existente.

## GEO: SEO local, JSON-LD, GEO e Webmaster

- Estado: TODO; prioridade: P2.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: metadados; conteúdo; ferramentas externas.
- Aceitação: Dados reais e documentação oficial; preservar política treinamento.
- Testes/evidência: Não auditado nesta retomada.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Verificar fontes oficiais e integrações existentes.

## QA: Regressão completa, segurança e responsividade

- Estado: IN_PROGRESS; prioridade: P3.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: tests; package.json.
- Aceitação: Lint/build e testes pertinentes; seis larguras; sem skips como sucesso.
- Testes/evidência: Lint em execução na sessão 71275.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Coletar resultado e executar build.

## RELEASE: Integração Git, preparação de deploy e relatório

- Estado: NEEDS_HUMAN_APPROVAL; prioridade: P3.
- Dependências: GIT e dependências técnicas indicadas na missão.
- Arquivos: deployment/DEPLOY_VPS.md; checkpoints.
- Aceitação: Código revisado; autorização específica antes de deploy.
- Testes/evidência: Sem deploy, push ou cobranças nesta retomada.
- Commit: não criado nesta retomada; base 3e49376.
- Próxima ação: Preparar resultado revisável antes de solicitar publicação.


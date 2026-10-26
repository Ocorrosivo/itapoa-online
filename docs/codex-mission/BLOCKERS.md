# Bloqueios e pendências

- 2026-10-25: deploy autorizado, mas duas falhas de integração e alteração concorrente em AppRoutes.tsx impedem publicar base revisada. Correções locais de cancelamento aguardam testes.

- Revisão automática de permissões bloqueou o início do teste de uploads por limite de uso, não por julgamento de insegurança.

- Deploy e cobranças reais: aguardam autorização específica; não bloqueiam trabalho local.
- Confirmação de recebimento SMTP exigirá usuário abrir a caixa de e-mail após teste autorizado.
- Ausência de checkpoints anteriores impede atestar DONE_VERIFIED histórico.
- Worktree raiz contém trabalho alheio; comparar antes de editar áreas sobrepostas.


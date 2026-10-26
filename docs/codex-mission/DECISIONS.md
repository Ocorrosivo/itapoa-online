# Decisões — 2026-10-24

- Consolidação local de quatro campos sociais: serviço normaliza/valida, whitelist permite, schema e migração MariaDB aditiva preparados (não aplicada em produção). Nenhum merge de worktrees.
- Nova solicitação: após cinco minutos encerrar tentativa. Código atual envia ao gateway expiração de 30 minutos (paymentService.ts). Não marcar cobrança cancelada apenas pelo relógio local; validar suporte do provedor e reconciliar pagamento antes de permitir substituição.

Corrigido somente o => ausente no teste cranky; nenhum merge. Lint e build da raiz verificados; não equivalem à validação funcional dos patches em outras worktrees.

- Checkpoints inexistentes: inicializados com fatos desta execução, sem inventar conclusão anterior.
- Base observada é main 3e49376, diferente da antiga codex/registration-email-flow. Não reaplicar patches históricos automaticamente.
- Preservar oito arquivos modificados na raiz, diretórios .agents/.claude-flow/.swarm e três stashes.
- cranky-raman e sweet-elion têm alterações sociais não commitadas; interesting-lamport está limpa. Nenhum merge realizado.
- Não liberar cancelamento de cobrança por simples UPDATE local sem reconciliar provedor.
- Preços comerciais permanecem os do backend; QA solicitado agora é Pix1/cartão2,50, ainda não alterado/ativado.


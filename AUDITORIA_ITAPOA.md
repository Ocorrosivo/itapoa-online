# Auditoria Itapoá Online — 23/10/2026

## Escopo e segurança

Missão: investigar pagamentos, uploads/persistência, banco, autenticação e publicação.
Trabalho isolado em `codex/auditoria-geral`, a partir de `1382af0`, para preservar
a limpeza não commitada da pasta principal. Não gerar cobranças reais, modificar
credenciais, redefinir senhas de clientes ou alterar volumes/banco de produção.

## Evidências iniciais

- Remoto confirmado: `Ocorrosivo/itapoa-online`.
- Actions de publicação `39892535134`: sucesso.
- HTTPS `/api/health`: HTTP 200, banco conectado; `X-Release-Sha`:
  `1382af00d26c8a2cd1056c3025c3d5cc19aa0e97`.
- `/api/payments/config`: public key ausente; cartão e Pix desabilitados.
  Isso demonstra indisponibilidade da configuração, não validade de credenciais.
- Gateway identificado no código: Mercado Pago REST e Card Payment Brick.
- `npm audit --json`: zero vulnerabilidades reportadas nesta consulta.
- `e8f4a21`: ausente localmente e GitHub retorna HTTP 422 para esse SHA.
- Regressão encontrada em `1382af0`: cancelamento local de tentativas após cinco
  minutos, mesmo sem conhecer o resultado financeiro. Pix criado com validade de
  30 minutos é apresentado como cinco minutos. Risco de cobrança duplicada.
- Upload valida MIME declarado, mas ainda não valida assinatura do conteúdo.
- Elevação de papel administrativo por endereço de e-mail encontrada na
  autenticação/cadastro; o papel deve ser exclusivamente o do banco.

## Validações ainda necessárias

Infraestrutura/volumes/backups externos: não revalidados nesta execução.
Não recriar containers nem publicar antes de comprovar backup externo íntegro.
Não confundir testes simulados com homologação real do gateway.
Recuperação: recebimento anterior de e-mail confirmado pelo usuário; conclusão da
troca de senha e login não comprovada, sem nova solicitação nesta execução.

## Próximos passos

1. Inspeção somente de leitura da VPS, configuração efetiva e volumes.
2. Regressões de pagamentos: testes com MySQL isolado e gateway simulado.
3. Uploads: validação de conteúdo, limites/erros e regressão de FormData.
4. Autorização: remover promoção implícita e testar isolamento.
5. Lint/build/testes, revisão e relatório de pendências antes de integração.

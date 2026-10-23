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

## Inspeção real da VPS — Actions 39905453643

- Imagem do serviço corresponde a `1382af0`; montagem Docker: `null`.
- Volume `itapoa_uploads`: não encontrado. `/app/uploads`: zero arquivos/bytes.
  Não concluir que os 142 arquivos históricos foram apagados: seu paradeiro não
  está comprovado. Não houve limpeza de arquivos nem alteração de volumes.
- Banco atual `itapoa_db`, MariaDB 11.8.9, 44 tabelas InnoDB.
- Contagens: usuários 7, empresas 20, vínculos 20, assinaturas 32,
  payment_logs 4, media_items 0. Consulta de órfãos em vínculos e assinaturas: zero.
  Isto não equivale a auditoria integral de todos os relacionamentos/índices.
- Chaves canônicas de pagamento ausentes tanto no ambiente quanto no registro
  `payment_config`; segredo de webhook ausente. SMTP host/senha presentes.
- Localizado manifesto de banco em `/var/backups/itapoa/password-recovery.9NlDNQRt/`.
  Conteúdo, restauração e cópia externa não foram revalidados nesta execução.
- Não encontrados executáveis rclone/restic/borg no PATH. Isso não prova ausência
  de backup externo por outro mecanismo.
- Credencial fornecida posteriormente: GET `/users/me` HTTP 200, sem cobrança,
  sem configuração de produção e sem valores de segredo nos arquivos do projeto.

## Correções e validações desta execução

- Preservação de tentativas financeiras desconhecidas; GET de status/retomada
  não cancela cobrança; prazo Pix recebido do gateway, não inventado localmente.
- FormData com Bearer canônico; uploads com assinatura de conteúdo, tamanho
  máximo, anti-IDOR e limpeza em falha de persistência no banco.
- Biblioteca separada da galeria, promoção idempotente e limite sob lock SQL.
- Removida promoção administrativa por e-mail; bloqueada alteração de campos
  financeiros/trial no perfil e movimentação de registros entre empresas.
- Criação de empresa e vínculo do proprietário na mesma transação.
- Suporte: identificador nativo sem nanoid não declarado; data gerada no SQL.
- Recuperadas correções SMTP/auth do commit 14f3ce0, ausentes da main.
- Verificação de e-mail não executa DDL em runtime nem considera falha de banco
  como identidade verificada. Erros conhecidos preservam código HTTP.
- Perfil admin usa API autenticada, não anuncia sucesso em erro HTTP e encerra
  sessão após troca de senha. E-mail permanece somente leitura, como na API.
- CI ampliado; deploy recusa armazenamento efêmero e PR não executa SSH/deploy.
- `npm run lint` e `npm run build`: exit 0.
- `node --import tsx --test tests/unit/*.test.ts tests/integration/*.test.ts`:
  122 testes, 12 suítes, 122 pass, zero falhas/skip. MariaDB local real; SDK/API
  financeira e envio de e-mail simulados; quatro cenários usam navegador real.
- `npm audit`: zero vulnerabilidades conhecidas reportadas nesta execução.

## Bloqueios antes de main/deploy

1. Confirmar backup externo íntegro do banco e uploads, especialmente os 142
   arquivos históricos, e restauração isolada. Responsável foi consultado.
2. Configurar armazenamento persistente após essa validação, sem sobrepor dados;
   copiar os arquivos existentes e testar preservação ao recriar container.
3. Inserir credenciais atuais diretamente no Easypanel. Credenciais publicadas
   no chat devem ser renovadas; não reutilizar automaticamente históricos.
4. Homologação externa controlada de cartão/Pix/webhook, sem cobrança real não
   autorizada. Ainda não há credenciais de teste disponíveis no ambiente seguro.
5. Confirmar administrador no papel correto do banco antes de retirar a promoção
   por e-mail em produção. Não promovemos usuários nem alteramos senhas.
6. Revisar diferenças finais contra main, CI do PR e só então integrar/publicar.

Não houve push na main, alteração do banco/configuração de produção, novo envio
de recuperação, troca de senha de cliente ou recriação de container nesta etapa.

## Complemento de verificação

Smoke com MySQL offline passou; Playwright de recuperação passou nos quatro
casos. Total desta etapa: 122 testes Node/integrados + 4 Playwright separados.
Consultas públicas de saúde, planos, categorias, cidades, busca Mercado/Pousada/
itapoa e disponibilidade da recuperação responderam HTTP 200.
Inspeção 39906490025 não localizou uploads nos caminhos legados consultados;
ZIP local antigo de publicação contém zero uploads. Relatório detalhado e
limitações: `RELATORIO_FINAL_ITAPOA.md`. Nenhum cenário simulado foi descrito
como homologação financeira real.

A limpeza paralela foi integrada pelo responsável em `origin/main` (`752e689`).
Seu diff foi revisto (remoção de componentes/rotinas legadas e chunks lazy); não
alterou pagamentos ou configuração de produção. Foi incorporada somente à branch
de auditoria em `232112c`. Lint/build e testes repetidos após essa integração.
CI do PR na revisão anterior passou lint/build, smoke e integração; etapa SSH foi
ignorada corretamente. Uma nova execução valida a revisão final do PR.

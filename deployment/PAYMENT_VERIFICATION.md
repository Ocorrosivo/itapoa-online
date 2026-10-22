# Pagamentos: correções e evidências — 21/10/2026

## Escopo e estado

Branch de trabalho: `codex/payment-hardening`, baseada em `2a9a428`.
Commit local autorizado; **sem push, deploy ou alteração do banco de produção**.
Os e-mails ficaram fora da tarefa. Chaves recebidas não foram gravadas no código,
em arquivos de teste, no Git ou no banco. Client Secret OAuth não foi necessário.

## Correções implementadas

- Webhook e reconciliação compartilham `paymentSettlement.ts`, com uma consulta
  autenticada do pagamento, conferência da conta recebedora em `/users/me`,
  `live_mode`, ID, referência obrigatória, BRL obrigatório e valor exato em centavos.
  Metadados de empresa/usuário, quando existentes, precisam corresponder ao pedido.
- A consulta de reconciliação não consulta o gateway duas vezes para depois
  anunciar um resultado presumido. Retorna o estado efetivamente processado.
- A assinatura usa o `data.id` da query assinada, não o ID do corpo; HMAC SHA-256,
  comparação constante, timestamp com tolerância de 300 segundos. Sem segredo,
  rejeita inclusive em desenvolvimento. Corpo conflitante é recusado. Não grava
  assinatura completa nem payload de cliente nos novos eventos/logs financeiros.
- O registro de entrega é um **journal síncrono**, não uma fila com worker.
  Somente responde 200 após processar e registrar o resultado. Gateway/SQL
  indisponível retorna 503 para nova entrega pelo Mercado Pago; divergência do
  pagamento retorna 422 sem concessão. Tópicos não aplicáveis são ignorados.
- Transação com bloqueio da empresa e assinatura mantém receipt, log e acesso
  atômicos. `gateway_payment_state` tem unicidade por pagamento e assinatura,
  cursor remoto e vencimento congelado. Repetições não estendem prazo; evento
  atrasado não regride aprovação nem reativa pagamento estornado/contestado.
- Estorno total ou parcial e chargeback cancelam o direito deste pagamento.
  Mediação suspende enquanto não houver confirmação posterior de aprovação.
  Outra contratação válida ou concessão administrativa é preservada. Não há
  chamadas de reembolso ou contestação para executar essa política.
- Vencimento usa aprovação + período contratado, não horário de entrega.
  Benefício pago vencido não se transforma em concessão administrativa por
  causa de badge/isSponsored em cache. Contratos legados sem data preservam a
  compatibilidade anterior; novas ativações sempre registram vencimento.
- Criações de cartão/Pix são serializadas por empresa/plano com GET_LOCK no
  mesmo banco e conexão, liberação em finally e timeout de aquisição. Uma
  tentativa desconhecida não recebe outro token/cartão nem outra cobrança.
  Reconciliação procura o pagamento por referência quando a resposta/ID foi
  perdido. Busca ambígua requer suporte. Plano já ativo bloqueia nova cobrança
  do mesmo plano; renovação antecipada exige fluxo próprio, não existe débito
  recorrente implementado por este checkout. Novos cartões são `onetime_card`.
- Cartão aprovado na resposta de criação não exibe sucesso antes do banco.
  Recarregamento retoma a tentativa no servidor. Tela de espera permite
  reconciliar e explica que não se deve pagar novamente. Pix não promete
  liberação no mesmo segundo. Código copia e cola ganhou rótulo acessível.
- O endpoint legado de redirecionamento `/payments/checkout`, não usado pela
  CheckoutPage atual, retorna 410: não oferece uma segunda via sem contrato de
  tentativa persistente. Usar cartão tokenizado/Pix do checkout atual.

## Evidências e limites

Validação local final: lint/typecheck e build com exit 0; 53 testes unitários,
41 testes HTTP/SQL diretos e 4 testes Chromium com backend/banco reais locais.
Também passou o smoke do servidor com banco indisponível. Respostas externas do
Mercado Pago e SDK são simuladas nessas suites; não são pagamentos de sandbox.

### Testes sintéticos com backend e banco reais locais

`tests/integration/payment-backend.test.ts` executa os handlers/serviços reais,
Express por HTTP e MariaDB 11.4.8 portátil, vinculado somente a localhost.
Banco exclusivo `itapoa_payments_test_<PID>`, dados fictícios e migrações do
projeto; a identidade master histórica de migração não é importada. O banco
temporário é descartado ao término. Nenhum banco externo é usado.

**Somente a fronteira HTTPS do Mercado Pago é simulada.** Casos: webhook válido,
assinatura inválida/ausente/antiga, conflito de IDs, tópico ignorado, pending,
in_process, authorized, rejected, cancelled, valor/moeda/referência ausentes ou
divergentes, um centavo de diferença, ID/recebedor/ambiente/empresa/usuário errados,
falta de autenticação, acesso a outra empresa, anunciante em operação admin,
12 notificações/reconciliações simultâneas, falha/timeout externo, rollback real
de SQL por trigger, eventos fora de ordem, refund/chargeback, concessão preservada,
criação de cobrança entre abas, resultado desconhecido, contrato expirado e
reaplicação da migração. Assertions verificam o banco, não respostas interceptadas
da aplicação. As permissões testadas são as do servidor, não mocks no navegador.

`tests/integration/payment-checkout-browser.test.ts` usa Chromium contra o
frontend, API e banco locais reais. Simula **SDK externo e gateway**, nunca a API
da aplicação. Cobre aprovado sem falso sucesso, recusa, análise, Pix copia e cola,
reload, confirmação posterior e duas abas com uma única cobrança/ativação.
O payload Pix sintético NÃO é pagável; não comprova QR válido do provedor.

Os testes unitários antigos foram preservados e sua distinção de isolamento
explicitada. Não substituem a integração acima.

### Integração real com sandbox

**Pendente nesta execução.** A única chamada realmente enviada ao Mercado Pago
foi `GET https://api.mercadopago.com/users/me` com a chave recebida, somente de
leitura e sem eco da credencial. Resposta HTTP 403; não comprovou autenticação,
conta de teste, `live_mode`, cartão ou Pix. Não presumimos a causa do 403.
Prefixo APP_USR sozinho não comprova produção nem conta de teste. Não foram
reutilizadas credenciais do histórico nem usadas chaves não homologadas para
enviar cartões simulados. O relatório anterior não foi tratado como prova.

### Verificação de produção — somente leitura

- `https://itapoa.online/api/health`: 200, `status=ok`, `database=connected`.
- `X-Release-Sha=2a9a4287a97a14e5cc5e27ff7dc818ded2ce46c3`.
- `/api/payments/config`: 200, cartão/Pix habilitados por presença de configuração;
  resposta com apenas os campos públicos. **Não comprova validade das chaves**.
- HTTPS e bundle público acessíveis. Não foi encontrado literal de Access Token
  no bundle principal consultado; isso não é auditoria de todos os chunks/logs.
- Webhook sem assinatura retornou 400 na versão publicada; reconciliação sem
  sessão e painel administrativo sem sessão retornaram 401. Não houve escrita
  financeira nessas requisições.
- Logs privados da VPS e configuração no dashboard do gateway não foram acessados
  nesta execução; não se declara inspeção desses ambientes.

### Pagamento real efetivamente concluído

**Não realizado.** Nenhuma cobrança, transferência, reembolso ou alteração
artificial de status foi feita em produção para anunciar sucesso.

## Como reproduzir os testes

1. Iniciar MariaDB/MySQL **de teste** em localhost:43316; root com a senha fictícia
   `payment-local-only`, ou definir `PAYMENT_TEST_DB_PASSWORD` somente no ambiente.
   Não apontar para uma instância de produção. Harness não usa DB_* de produção.
2. `npm ci`, `npm run lint`, `npm run build`.
3. `npx playwright install chromium` (no Linux pode exigir `--with-deps`).
4. `node --import tsx --test tests/integration/payment-backend.test.ts tests/integration/payment-checkout-browser.test.ts`.
5. Rodar unitários e `node scripts/smoke-catalog.mjs --offline` com DB_* fictícios.
   O workflow de deploy recebeu banco descartável e essas suites **antes** do SSH.
   A execução local não certifica que a mudança do workflow já rodou no GitHub.

MariaDB Windows foi obtido de
https://archive.mariadb.org/mariadb-11.4.8/winx64-packages/ e validado por SHA-256
do arquivo oficial. Binários/dados ficam em `.test-runtime/`, ignorado no Git.

## Ativação futura: backup, migração, publicação e reversão

Não executar SQL automaticamente no deploy. Antes de publicar, solicitar a
autorização específica de migração, identificar o banco pelo ambiente **do
container da aplicação**, fazer dump consistente protegido e validar checksum e
restauração isolada. Não usar os scripts legados PM2/Caddy/FTP.

Aplicar somente `database/migrations/20261021_payment_settlement.sql`; conferir
também se `webhook_events` da migração já existente está disponível. O novo DDL
é aditivo/repetível e não altera usuários, empresas, senhas ou assinaturas.
Comparar contagens antes/depois. Não reimportar schema completo ou seeds.
O deploy ganhou preflight somente leitura: se faltarem as tabelas, aborta antes
de trocar a imagem e preserva o serviço atual.

`MERCADOPAGO_MODE=production` exige live_mode=true; `test` exige false, independente
de NODE_ENV. Sem a variável, TEST- implica teste; outra chave exige live_mode=true.
Para conta de teste com APP_USR, configurar mode=test explicitamente, **somente em
ambiente e banco isolados**. Configuração em payment_config tem precedência sobre
env; conferir o par Public Key/Access Token sem copiá-lo para relatórios.

Reversão: manter dump, volumes e as duas versões de imagem, além dos valores
atuais do ambiente em armazenamento protegido. Não apagar o ledger no rollback
nem importar dump por cima de vendas posteriores. Versão antiga não preserva
todas estas garantias; interromper novas cobranças durante análise e planejar
reconciliação antes de reabri-las. Restauração do banco exige autorização própria.

## Pendências para concluir homologação real e produção

1. Resolver o HTTP 403 e comprovar conta/credenciais oficiais de teste, configuradas
   em ambiente seguro isolado. Repetir cartão aprovado/recusado/em análise e Pix
   real de sandbox; confirmar callback assinado e consultar o banco local.
2. Validar no dashboard a URL HTTPS `/api/webhooks/mercadopago`, eventos e segredo.
3. Após autorização de migração/publicação, integrar/revisar main, acompanhar
   Actions e conferir health + SHA da release. Este commit local não publica.
4. Para teste real: autorização explícita para UMA compra do plano Gold pelo preço
   atual retornado do servidor (valor de referência observado: R$49,90). Confirmar
   o preço na hora; não criar plano de R$1 nem alterar catálogo. O titular realiza
   o pagamento no ambiente oficial; conferir payment_id, confirmação validada,
   assinatura e empresa corretas no banco e acesso liberado. Sem essa ação,
   registrar pagamento real como pendente. Reembolso não está autorizado.

## Documentação oficial consultada

- Assinatura e respostas/reentregas:
  https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
- Validador oficial e recomendações de processamento:
  https://github.com/mercadopago/sdk-nodejs/blob/master/docs/webhooks.md
- Recurso canônico e datas:
  https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/get-payment/get
- Idempotência:
  https://www.mercadopago.com.br/developers/pt/news/2023/01/04/Idempotency-key-usage-will-be-mandatory

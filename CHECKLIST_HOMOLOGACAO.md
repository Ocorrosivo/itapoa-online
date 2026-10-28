# Checklist de Homologação — Pix / Cartão / Webhook / Trial

**Escopo:** validação funcional em staging isolado (banco e credenciais de teste próprios) do fluxo de contratação de `https://itapoa.online`.
**Código auditado:** `src/server/services/paymentService.ts`, `paymentSettlement.ts`, `checkoutOffer.ts`, `entitlementService.ts`, `src/server/routes/mercadoPagoWebhook.ts`, `src/server/routes/api.ts`.
**Data:** 28/10/2026 · Nenhuma cobrança real foi executada ao gerar este documento.

> Regra de ouro: staging nunca aponta `DB_*` nem `MERCADOPAGO_*` para produção.
> O harness de testes já recusa a porta 3306 e qualquer porta < 1024 (`tests/helpers/paymentHarness.ts:26`).

---

## 0. Pré-requisitos de ambiente

| Variável | Valor em staging | Observação |
|---|---|---|
| `NODE_ENV` | `production` | Exercita o caminho estrito; `assertGatewayReady()` passa a exigir o webhook secret |
| `APP_URL` | URL pública do staging | Vai em `notification_url`; precisa ser alcançável pelo Mercado Pago |
| `MERCADOPAGO_ACCESS_TOKEN` | chave `TEST-` da aplicação de teste | `payment_config.accessToken` tem precedência sobre a env |
| `MERCADOPAGO_PUBLIC_KEY` | public key da mesma aplicação | Idem: banco vence a env |
| `MERCADOPAGO_WEBHOOK_SECRET` | segredo de assinatura | Sem ele todo webhook é rejeitado com `401` |
| `MERCADOPAGO_MODE` | `test` | Ausente + `TEST-` ⇒ teste; `APP_USR` implicaria `live_mode=true` |
| `DB_*` | banco dedicado de staging | Nunca o banco de produção |
| `JWT_SECRET` | ≥ 32 caracteres | `env.ts` encerra o processo se faltar |

- [ ] `.env` de staging criado a partir de `.env.example`, fora do Git
- [ ] Schema + migrações aplicados no banco de staging (`MYSQL_SCHEMA.sql` + `database/migrations/*`)
- [ ] `SEED.sql` importado (roles, planos canônicos, `payment_config`)
- [ ] Par Public Key / Access Token pertence à mesma aplicação e ao mesmo ambiente
- [ ] `GET /api/payments/config` retorna `pixEnabled: true` e `cardEnabled: true`
- [ ] URL `https://<staging>/api/webhooks/mercadopago` cadastrada no painel do Mercado Pago

---

## 1. PIX — emissão e liquidação

**Código:** `paymentService.createPixPayment()` → `createPixPaymentLocked()`; liquidação em `paymentSettlement.settlePayment()`.

- [ ] `POST /api/payments/pix` com `X-Idempotency-Key` derivado de `requestId` cria `subscriptions` com `status='pending'`, `paymentMethod='pix'`, `contracted_price` e `nextBillingDate = +30d`
- [ ] `payment_logs` recebe `gateway_reference` = id do pagamento no MP, status `pending`
- [ ] QR Code e `qr_code_base64` retornam no corpo da resposta
- [ ] Repetir `POST /api/payments/pix` com o mesmo `requestId` não cria segunda cobrança (`GET_LOCK` + `pending` existente em `getActivePixForCompany`)
- [ ] `POST` concorrente para a mesma empresa/plano retorna `409` ("Uma tentativa está sendo processada")
- [ ] Pagamento aprovado no checkout do MP dispara webhook → `subscriptions.status='active'`, `companies.planLevel='gold_vip'`, `access_grant_type='paid'`, `isSponsored=1`
- [ ] `gateway_payment_state` grava uma linha com `activated_at` e `expires_at`
- [ ] `payment_logs.status` vira `paid`
- [ ] E-mail de confirmação é enviado (`mailService.sendPaymentApproved`), falha de SMTP não bloqueia a liquidação
- [ ] Pix expirado (30 min) não ativa nada; `GET /api/payments/pix/active` deixa de devolver a tentativa
- [ ] Tentativa órfã (sem registro no gateway) é cancelada por `reconcilePayment()` e libera nova compra

---

## 2. CARTÃO — tokenização Brick

**Código:** `paymentService.createCardPayment()` → `createCardPaymentLocked()`. Apenas token do SDK é aceito; preço vem do banco.

- [ ] `POST /api/payments/card` exige `requestId` UUID v4, `formData.token`, `payment_method_id`, `installments` 1–12, e-mail válido e CPF/CNPJ coerente — qualquer divergência retorna `400`
- [ ] Valor cobrado é exatamente `plans.price` do banco (nunca do navegador)
- [ ] Cartão aprovado na resposta do `POST /v1/payments` **não** ativa o plano; resposta traz `status` do gateway e a ativação aguarda webhook
- [ ] Cartão recusado (`rejected`/`cancelled`) marca `subscriptions.status='canceled'` e não concede acesso
- [ ] Timeout ou `5xx` do gateway devolve `status: 'unknown'` e preserva a tentativa; recarregar a página retoma a mesma tentativa sem novo token
- [ ] Duas abas simultâneas geram **uma única** cobrança (`GET_LOCK` por `companyId:planId`)
- [ ] Mesma `requestId` reenviada retorna `409` ("Esta tentativa já foi utilizada")
- [ ] Plano já ativo bloqueia nova cobrança do mesmo plano (`409`)

---

## 3. WEBHOOK — assinatura, fila e idempotência

**Código:** `src/server/routes/mercadoPagoWebhook.ts`. Handler montado **antes** do `express.json` global, com limite de 256 kb.

- [ ] Assinatura válida (`ts`, `v1` HMAC-SHA256 sobre `id:<data.id>;request-id:<rid>;ts:<ts>;`) retorna `200`
- [ ] Assinatura ausente, inválida ou com `ts` fora da janela de 300 s retorna `401` e **não** grava em `webhook_events`
- [ ] `data.id` do corpo divergente do `data.id` da query retorna `400`
- [ ] Tópico diferente de `payment` (ex.: `merchant_order`) retorna `200` com `ignored: true`, sem chamada ao gateway
- [ ] Reentrega do mesmo `gateway_event_id` é deduplicada pela `UNIQUE KEY uniq_gateway_event` e não estende `expires_at`
- [ ] Evento atrasado (`remote_updated_at` anterior ao gravado) não regride `approved` → `pending`
- [ ] `503` em falha transitória de gateway/SQL força redelivery pelo MP; `422` só em divergência permanente
- [ ] `webhook_events.status` percorre `pending → processing → done` (ou `failed` com `last_error`)
- [ ] Nenhum payload de cliente nem assinatura completa é persistido (`signature_header` é gravado como `NULL`)

---

## 4. Liquidação — contrato de valor e ambiente

**Código:** `paymentSettlement.assertGatewayPayment()` + `settlePayment()`.

- [ ] `external_reference` obrigatório e igual ao `subscriptionId` do pedido
- [ ] `currency_id` diferente de `BRL` → `422`, sem alteração no banco
- [ ] `collector_id` diferente de `/users/me.id` → `422`
- [ ] `live_mode` divergente de `MERCADOPAGO_MODE` → `422`
- [ ] Diferença de **1 centavo** no `transaction_amount` → `422` (comparação em centavos, sem epsilon)
- [ ] `metadata.company_id` / `metadata.user_id` divergentes do pedido → `422`
- [ ] `payment_method_id` incompatível com `subscriptions.paymentMethod` → `422`
- [ ] Estorno total ou parcial (`transaction_amount_refunded > 0`) marca `refunded` e cancela o direito
- [ ] Chargeback idem; `in_mediation` suspende sem reativar
- [ ] Concessão administrativa ativa ou outra contratação válida é preservada na expiração
- [ ] `nextBillingDate` é congelado na primeira aprovação (`approved.date_approved + billing_period_days`)

---

## 5. Oferta de teste (R$ 1 / R$ 2)

**Código:** `checkoutOffer.ts`. Desligada por padrão — exige as três variáveis.

- [ ] Sem `PAYMENT_TEST_ACCOUNT_EMAIL`, `PAYMENT_TEST_STARTS_AT` e `PAYMENT_TEST_EXPIRES_AT`, `GET /api/payments/quote` devolve o preço cheio
- [ ] Datas sem sufixo `Z`, janela > 24 h, `until <= from` ou data inválida desligam a oferta
- [ ] `TESTEPIX1` (R$ 1,00) e `TESTECARTAO2` (R$ 2,00) só valem para a conta cujo e-mail bate com `PAYMENT_TEST_ACCOUNT_EMAIL`
- [ ] Cupom em plano Bronze é recusado (`400`)
- [ ] Segunda tentativa com o mesmo cupom e mesma modalidade retorna `409`
- [ ] `quotedAmount` divergente do preço vigente retorna `409` ("O valor mudou")
- [ ] Modalidades independentes: usar o cupom Pix não consome o do cartão
- [ ] Tentativa reservada consome a oferta mesmo em timeout, recusa ou estorno

---

## 6. Trial de 7 dias (Gold VIP)

**Código:** `entitlementService.checkTrialEligibility()` + `startSevenDayGoldTrial()`; exposição em `POST /api/companies/:id/claim` e `POST /api/plans/start-trial`.

- [ ] Elegível = `has_used_trial = 0` **e** `trial_ends_at IS NULL` **e** sem `subscriptions` ativa **e** `planLevel = bronze`
- [ ] `POST /api/companies/:id/claim` exige `responsibleName`, `responsiblePhone` e `acceptCampaignTerms`; sem eles retorna `400`
- [ ] Claim por terceiro quando já existe owner retorna `403`
- [ ] Sucesso grava `planLevel='gold_vip'`, `access_grant_type='trial'`, `trial_ends_at = +7*24h`, `has_used_trial=1`, `isSponsored=1`
- [ ] Segunda tentativa de trial retorna "já usufruiu dos 7 dias"
- [ ] `GET /api/plans/trial-eligibility/:companyId` de outra empresa retorna `403`
- [ ] Após `trial_ends_at`, `getCompanyEntitlements()` rebaixa para Bronze (`access_grant_type='bronze'`, `isSponsored=0`) **sem** apagar conteúdo
- [ ] Se houver assinatura paga válida no vencimento do trial, prevalece `paid` (nunca rebaixa para Bronze)
- [ ] `TrialService.calculateTrialStatus()` sinaliza `readOnlyMode` após expirar
- [ ] `has_used_trial=1` é irreversível; reset manual exige `admin_master`

---

## 7. Autorização e multi-tenant

- [ ] `POST /api/payments/pix` e `/card` de empresa de terceiro retornam `403` (`requireCompanyAccess`)
- [ ] `POST /api/payments/subscription/:id/reconcile` de outra empresa retorna `403`; sem token, `401`
- [ ] `GET /api/payments/subscription/:id/status` de outra empresa retorna `403`
- [ ] `GET /api/admin/plans` por `advertiser` retorna `403`
- [ ] Token com `sessionVersion` defasado (senha trocada) é rejeitado
- [ ] `POST /api/products` acima do limite do plano retorna `403` com `upgradeRequired: true`
- [ ] `POST /api/companies/:id/media` acima do limite de galeria retorna `403` (validação sob lock)
- [ ] Itens já existentes acima do limite permanecem preservados

---

## 8. Regressão automatizada antes de liberar

Executar, nesta ordem, com banco de teste em `127.0.0.1:43316`:

    npm ci
    npm run lint
    npm run build
    node --import tsx --test tests/unit/*.test.ts
    node --import tsx --test tests/integration/*.test.ts

- [ ] `npm run lint` (tsc --noEmit) e `npm run build` concluídos com exit 0
- [ ] Suítes de `tests/unit` e `tests/integration` verdes
- [ ] `payment-backend.test.ts` cobre webhook válido, assinatura inválida/ausente/antiga, conflito de IDs, tópico ignorado, todos os estados sem aprovação, 16 casos de divergência e IDOR
- [ ] `payment-checkout-browser.test.ts` verde em Chromium contra frontend/API/banco reais locais
- [ ] Nenhum teste substitui um pagamento real de sandbox — o 403 do `/users/me` registrado em `deployment/PAYMENT_VERIFICATION.md:90-96` continua pendente de resolução

---

## 9. Critérios de saída

Homologação considerada concluída quando:

1. Um Pix de sandbox e um cartão de sandbox foram aprovados com liberação de plano verificada **no banco**, não na tela.
2. Uma reentrega de webhook e uma reconciliação produziram estado idêntico ao primeiro processamento.
3. Um caso de divergência (valor, moeda, coletor ou ambiente) foi rejeitado com `422` sem escrita financeira.
4. O trial de 7 dias foi ativado uma vez, reverteu para Bronze no vencimento e bloqueou a repetição.
5. Todos os itens de §7 (autorização) confirmados contra a API em execução.

**O que este checklist não cobre:** validação das chaves reais de produção no dashboard do Mercado Pago, execução da migração em produção, publicação da `main` e pagamento real. Cada um exige autorização específica — ver `AGENTS.md` e `deployment/DEPLOY_VPS.md`.

# Promoção restrita de homologação do checkout

Esta promoção NÃO é um cupom público dos anúncios. Não altera `plans.price`,
não usa dados do pagador como autorização e não concede acesso sem confirmação.
O backend identifica a conta autenticada pelo e-mail real do registro `users`.

Configuração separada e explícita no ambiente do serviço Easypanel:

```
PAYMENT_TEST_ACCOUNT_EMAIL=<conta-autorizada>
PAYMENT_TEST_STARTS_AT=<ISO-UTC-com-Z>
PAYMENT_TEST_EXPIRES_AT=<ISO-UTC-com-Z>
```

Desativada por padrão. Exige janela válida de no máximo 24 horas; vencimento
automático no servidor, sem automação ou alteração de infraestrutura posterior.
Nunca versionar o endereço da conta ou quaisquer credenciais de produção.

- Gold VIP e Diamond: `TESTECARTAO2` = R$ 2,00 no cartão;
  `TESTEPIX1` = R$ 1,00 no Pix. Cada código só vale na modalidade correspondente.
- A conta autorizada vê o cupom automaticamente no `/checkout`, após login,
  consulta autenticada `/api/payments/quote` e seleção do meio de pagamento.
- Uma tentativa por conta/modalidade, inclusive entre empresas/planos diferentes.
  A reserva é persistida no `payment_type` existente de `subscriptions` sob lock
  SQL por conta/modalidade. Não há migração nem tabela adicional.
- Tentativas com timeout, recusa, cancelamento ou estorno também consomem a
  reserva. Não reciclar um desconto enquanto o resultado financeiro é incerto.
  Abrir outra janela NÃO apaga o histórico nem permite reutilização.
- Valores enviados ao gateway, `amount`, `contracted_price`, logs e resumo
  usam o mesmo preço calculado no servidor. O cliente não escolhe esse preço;
  um valor cotado divergente é recusado antes de criar a cobrança.
- Um cupom enviado depois de vencer ou por outra conta é recusado. Não trocar
  silenciosamente o pedido com cupom por uma cobrança de valor integral.
- Após recarregar, mostrar o valor congelado da tentativa, mesmo se a promoção
  já tiver vencido. Não emitir outra cobrança para recuperar uma tentativa.
- Os limites de plano ativo e conciliação/webhook continuam funcionando.
  Para testar ambas as modalidades numa única empresa, pode-se contratar Gold
  e depois fazer upgrade para Diamond: são pedidos distintos, não duplicação
  do mesmo plano. Respeitar a autorização de valor e modalidade do usuário.

Dados do cartão e documentos reais ficam no formulário seguro, preenchidos pelo
usuário. Não inventar CPF/CNPJ para pagamentos de produção. Não alterar status
financeiro, conceder plano, emitir estorno ou apagar reservas para forçar sucesso.
Gerar QR Code não comprova pagamento; ativação depende da confirmação validada.

Antes de ativar: lint/build/testes e deploy verificado de acordo com
`DEPLOY_VPS.md`. Aplicar essas variáveis como configuração autorizada separada;
preservar integralmente as demais variáveis e o volume. Revalidar versão/saúde
após o controlador aplicar a configuração. Não declarar homologação real sem
conferir pagamento → webhook/consulta autenticada → banco → acesso.

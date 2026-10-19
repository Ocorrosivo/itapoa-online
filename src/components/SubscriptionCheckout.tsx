/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Subscription checkout: tokenizes the card via CardPayment brick and
 * creates a preapproval (assinatura) server-side. PIX/Checkout Pro
 * continuam disponíveis via BillingService.
 */

import { useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { api } from '../lib/apiClient';

let mpInitialized = false;
function ensureMp(publicKey: string) {
  if (!mpInitialized && publicKey) {
    initMercadoPago(publicKey, { locale: 'pt-BR' });
    mpInitialized = true;
  }
}

interface Props {
  companyId: string;
  planId: string;
  amount: number;
  payerEmail: string;
  publicKey: string;
  onSuccess?: (subscriptionId: string) => void;
}

export function SubscriptionCheckout({ companyId, planId, amount, payerEmail, publicKey, onSuccess }: Props) {
  ensureMp(publicKey);
  const [status, setStatus] = useState<'idle' | 'loading' | 'approved' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  if (status === 'approved') {
    return (
      <div className="checkout-success rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
        <h2 className="text-lg font-black text-emerald-900">Assinatura ativa!</h2>
        <p className="text-sm text-emerald-700 mt-1">
          Cobrança automática todo mês no cartão cadastrado. Você já pode usar os recursos do plano.
        </p>
        <p className="text-xs text-emerald-600 mt-3">
          Dica: rode <code className="bg-emerald-100 px-1 rounded">/mp-review</code> antes de ir para produção.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="checkout-total text-base">
        Total: <strong>R$ {amount.toFixed(2).replace('.', ',')}/mês</strong>
      </p>

      {status === 'loading' && (
        <div className="checkout-loading rounded-xl bg-slate-50 border p-4 text-center text-sm text-slate-600">
          Processando sua assinatura…
        </div>
      )}

      {status === 'error' && (
        <div className="checkout-error rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <p>Não foi possível ativar: {msg}</p>
          <p className="text-xs mt-2 text-red-600">
            Em teste, use nome <strong>APRO</strong> para aprovar ou <strong>FUND</strong> para saldo insuficiente.
          </p>
        </div>
      )}

      <CardPayment
        initialization={{ amount, payer: { email: payerEmail } } as any}
        onSubmit={async (formData: any) => {
          const cardTokenId: string | undefined = formData?.token;
          if (!cardTokenId) {
            setMsg('Token do cartão não gerado. Verifique os dados do cartão.');
            setStatus('error');
            return;
          }
          setStatus('loading');
          setMsg('');
          try {
            const res = await api.post<{ subscriptionId: string; preapprovalId: string; status: string }>(
              '/api/payments/subscribe',
              { companyId, planId, payerEmail, cardTokenId }
            );
            setStatus('approved');
            onSuccess?.(res.subscriptionId);
          } catch (e: any) {
            setMsg(e?.message || 'Erro ao criar assinatura.');
            setStatus('error');
          }
        }}
        onError={(err: any) => {
          setMsg(String(err?.message || err || 'Erro no formulário de cartão.'));
          setStatus('error');
        }}
      />
    </div>
  );
}

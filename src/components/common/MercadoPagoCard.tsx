import React, { useEffect, useRef, useState } from 'react';

type Brick = { unmount: () => Promise<void> | void };
type MercadoPagoConstructor = new (key: string, options: { locale: string }) => {
  bricks: () => { create: (type: string, id: string, settings: Record<string, unknown>) => Promise<Brick> };
};
declare global { interface Window { MercadoPago?: MercadoPagoConstructor } }

let sdkPromise: Promise<void> | null = null;
function loadSDK() {
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => window.MercadoPago ? resolve() : reject(new Error('SDK indisponível.'));
    script.onerror = () => { sdkPromise = null; script.remove(); reject(new Error('Não foi possível carregar o formulário seguro.')); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/** Card number/CVV are collected by Mercado Pago secure fields, never React or our server. */
export function MercadoPagoCard({ publicKey, amount, email, onSubmit }: {
  publicKey: string; amount: number; email?: string; onSubmit: (data: Record<string, unknown>) => Promise<void>;
}) {
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '') + '-card-payment';
  useEffect(() => {
    let canceled = false;
    let brick: Brick | undefined;
    setError(''); setLoading(true);
    (async () => {
      await loadSDK();
      if (canceled) return;
      const mp = new window.MercadoPago!(publicKey, { locale: 'pt-BR' });
      const created = await mp.bricks().create('cardPayment', id, {
        initialization: { amount, ...(email ? { payer: { email } } : {}) },
        customization: { paymentMethods: { maxInstallments: 1 } },
        callbacks: {
          onReady: () => { if (!canceled) setLoading(false); },
          onError: () => { if (!canceled) { setError('Não foi possível carregar os campos de cartão. Confira a configuração do Mercado Pago ou tente novamente.'); setLoading(false); } },
          onSubmit: (data: Record<string, unknown>) => submitRef.current(data)
        }
      });
      if (canceled) await created.unmount(); else brick = created;
    })().catch(() => { if (!canceled) { setError('O formulário seguro de cartão está indisponível. Tente recarregar a página.'); setLoading(false); } });
    return () => { canceled = true; void brick?.unmount(); };
  }, [publicKey, amount, email, id]);
  return <div>
    {loading && <p role="status" className="text-sm text-slate-500 py-4">Carregando campos seguros do cartão…</p>}
    {error && <p role="alert" className="text-sm text-red-700 py-4">{error}</p>}
    <div id={id} />
    <p className="text-xs text-slate-500 mt-3">Dados do cartão protegidos pelo Mercado Pago. CPF/CNPJ será solicitado no formulário seguro.</p>
  </div>;
}

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

type Brick = { unmount: () => Promise<void> | void };
type MercadoPagoConstructor = new (key: string, options: { locale: string }) => {
  bricks: () => { create: (type: string, id: string, settings: Record<string, unknown>) => Promise<Brick> };
};

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

let sdkPromise: Promise<void> | null = null;
function loadSDK(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src*="sdk.mercadopago.com/js/v2"]');
      if (existing) {
        if (window.MercadoPago) return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('SDK indisponível.')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => (window.MercadoPago ? resolve() : reject(new Error('SDK indisponível.')));
      script.onerror = () => {
        sdkPromise = null;
        script.remove();
        reject(new Error('Não foi possível carregar o formulário seguro.'));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

export interface MercadoPagoCardProps {
  publicKey: string;
  amount: number;
  email?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  disabled?: boolean;
}

const CONTAINER_ID = 'itapoa-secure-card-payment-brick';

/**
 * Card Brick do Mercado Pago oficial.
 * O container é estável e a inicialização é protegida contra desmontagens prematuras,
 * alternâncias de aba e digitação de e-mail sem recriar os frames de cartão.
 */
export function MercadoPagoCard({ publicKey, amount, email, onSubmit, disabled }: MercadoPagoCardProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);
  const brickControllerRef = useRef<Brick | null>(null);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  const initialEmailRef = useRef(email);

  useEffect(() => {
    isMountedRef.current = true;
    setError('');
    setLoading(true);

    let active = true;

    async function init() {
      if (!publicKey || typeof amount !== 'number' || amount <= 0) {
        if (active) setLoading(false);
        return;
      }

      try {
        await loadSDK();
        if (!active || !isMountedRef.current) return;

        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        // Se já existia um brick anterior, desmonta com segurança antes de recriar
        if (brickControllerRef.current) {
          try {
            await brickControllerRef.current.unmount();
          } catch {
            // Unmount silencioso
          }
          brickControllerRef.current = null;
        }

        // Limpa resíduos internos do container sem desmontá-lo
        container.innerHTML = '';

        if (!active || !isMountedRef.current) return;

        const mp = new window.MercadoPago!(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();

        const createdBrick = await bricksBuilder.create('cardPayment', CONTAINER_ID, {
          initialization: {
            amount: Number(amount.toFixed(2)),
            payer: {
              email: initialEmailRef.current || undefined
            }
          },
          customization: {
            paymentMethods: {
              maxInstallments: 1
            },
            visual: {
              style: {
                theme: 'flat',
                customVariables: {
                  formBackgroundColor: '#ffffff',
                  baseColor: '#0f172a',
                  baseColorFirstVariant: '#1e293b',
                  baseColorSecondVariant: '#334155',
                  outlinePrimaryColor: '#0f172a',
                  outlineSecondaryColor: '#e2e8f0',
                  buttonTextColor: '#ffffff',
                  fontSizeMedium: '15px',
                  borderRadiusMedium: '12px'
                }
              }
            }
          },
          callbacks: {
            onReady: () => {
              if (active && isMountedRef.current) {
                setLoading(false);
              }
            },
            onError: (err: unknown) => {
              if (active && isMountedRef.current) {
                console.warn('[MercadoPagoCard] Brick error:', err);
                setError('Não foi possível inicializar os campos seguros do cartão. Confira os dados ou selecione Pix.');
                setLoading(false);
              }
            },
            onSubmit: async (cardFormData: Record<string, unknown>) => {
              await submitRef.current(cardFormData);
            }
          }
        });

        if (!active || !isMountedRef.current) {
          try {
            await createdBrick.unmount();
          } catch {}
          return;
        }

        brickControllerRef.current = createdBrick;
      } catch (err: any) {
        if (active && isMountedRef.current) {
          console.warn('[MercadoPagoCard] Init exception:', err?.message || err);
          setError('O formulário seguro de cartão está temporariamente indisponível. Utilize Pix para liberação imediata.');
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      active = false;
      isMountedRef.current = false;
      if (brickControllerRef.current) {
        const controller = brickControllerRef.current;
        brickControllerRef.current = null;
        try {
          // Desmonta assincronamente sem bloquear a renderização
          Promise.resolve(controller.unmount()).catch(() => {});
        } catch {}
      }
    };
  }, [publicKey, amount]);

  return (
    <div className="relative">
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-3 py-10 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-sm font-medium my-2"
        >
          <Loader2 size={20} className="animate-spin text-slate-900" />
          <span>Carregando campos seguros do cartão criptografados pelo Mercado Pago…</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 p-4 mb-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm"
        >
          <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Atenção no formulário</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Container estável do Card Brick */}
      <div
        id={CONTAINER_ID}
        className={`min-h-[220px] transition-opacity duration-200 ${loading ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      />

      <div className="flex items-center gap-2 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
        <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
        <span>Seus dados são criptografados de ponta a ponta e enviados diretamente ao Mercado Pago.</span>
      </div>
    </div>
  );
}

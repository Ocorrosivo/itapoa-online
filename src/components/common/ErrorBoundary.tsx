/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Global React Error Boundary Component
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export function ErrorBoundary({ children }: Props) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      // Ignore errors from browser extensions or non-app scripts.
      const msg = event.message || '';
      if (msg.includes('chrome-extension') || msg.includes('moz-extension')) return;
      console.error('Captured window error:', event.error);
      setHasError(true);
      setError(event.error || new Error(event.message));
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error('Captured unhandled rejection:', event.reason);
      setHasError(true);
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  const handleReset = () => {
    setHasError(false);
    setError(null);
  };

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Algo deu errado</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tente voltar à página inicial. Se o erro persistir, recarregue a aplicação.
            </p>
          </div>

          {error && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left font-mono text-[10px] text-red-400 max-h-28 overflow-y-auto">
              {error.toString()}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                handleReset();
                // Volta à home sem recarregar toda a aplicação quando possível.
                try {
                  window.history.pushState(null, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                } catch {
                  window.location.href = '/';
                }
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 font-bold text-white text-xs rounded-xl transition shadow flex items-center justify-center gap-2"
            >
              <span>Voltar ao Início</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar Aplicação</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

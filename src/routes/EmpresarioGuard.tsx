/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Empresário Guard Component
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

export const EmpresarioGuard: React.FC<{ children: React.ReactNode; onRedirectLogin: () => void }> = ({
  children,
  onRedirectLogin
}) => {
  const { isAuthenticated, isEmpresario } = useAuth();

  if (!isAuthenticated || !isEmpresario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Painel do Empresário</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Gerencie o mini-site da sua empresa, produtos, cupons e CRM de clientes.
          </p>
          <button
            onClick={onRedirectLogin}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition"
          >
            Acessar Painel Empresarial
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Admin Master Guard Component
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

export const AdminGuard: React.FC<{ children: React.ReactNode; onRedirectLogin: () => void }> = ({
  children,
  onRedirectLogin
}) => {
  const { isAuthenticated, isAdminMaster } = useAuth();

  if (!isAuthenticated || !isAdminMaster) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Acesso Restrito - Admin Master</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Esta área é exclusiva para a administração central da plataforma SaaS.
          </p>
          <button
            onClick={onRedirectLogin}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
          >
            Fazer Login Admin Master
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

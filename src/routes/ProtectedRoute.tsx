/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ProtectedRoute Guard Component for Flexible ACL Route Protection
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthorizationService } from '../services/authorizationService';
import { PermissionCode } from '../types/authPermissions';

interface ProtectedRouteProps {
  permission: PermissionCode;
  onRedirectLogin: () => void;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  onRedirectLogin,
  children
}) => {
  const { user, isAuthenticated } = useAuth();
  const hasAccess = AuthorizationService.hasPermission(user, permission);

  if (!isAuthenticated || !hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Acesso Não Autorizado</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Sua conta não possui a permissão <code className="text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">{permission}</code> para visualizar este recurso.
          </p>
          <button
            onClick={onRedirectLogin}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition"
          >
            Fazer Autenticação
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

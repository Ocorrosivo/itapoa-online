/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Auth Context - Master, Empresário & Impersonation Engine
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { RoleCode, PermissionCode } from '../types/authPermissions';
import { AuthorizationService } from '../services/authorizationService';
import {
  api,
  getToken,
  setToken as setToken_,
  clearToken,
  USER_KEY
} from '../lib/apiClient';

interface AuthContextType {
  user: User | null;
  realAdminUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdminMaster: boolean;
  isEmpresario: boolean;
  isImpersonating: boolean;
  roleCode: RoleCode;
  hasPermission: (permission: PermissionCode) => boolean;
  can: (resource: any, action: any) => boolean;
  /**
   * Authenticates against the API with the real password and stores the JWT.
   * Returns the authenticated user so the caller can route immediately without
   * waiting for the context state to settle. null means the login failed.
   */
  login: (email: string, password: string) => Promise<User | null>;
  /** Adopts a session already returned by /api/auth/login or /register. */
  adoptSession: (token: string, user: User) => void;
  logout: () => void;
  impersonateCompany: (companyId: string, companyName: string) => Promise<boolean>;
  stopImpersonating: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /** Reads a persisted JSON value without breaking on corrupted storage. */
  const readStored = <T,>(key: string): T | null => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : null;
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState<User | null>(() => readStored<User>(USER_KEY));

  const [realAdminUser, setRealAdminUser] = useState<User | null>(() =>
    readStored<User>('saas_real_admin')
  );

  // The token itself lives in apiClient (TOKEN_KEY); this mirror is for the UI.
  const [token, setToken] = useState<string | null>(() => getToken());

  /**
   * Revalidates the stored session against the API on mount. A token that the
   * backend rejects is discarded, so the UI cannot show a logged-in shell for
   * an expired or revoked session.
   */
  useEffect(() => {
    const stored = getToken();
    if (!stored) return;

    let active = true;
    api
      .get<User>('/api/auth/profile')
      .then(profile => {
        if (!active || !profile) return;
        setUser(profile);
        setToken(stored);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      })
      .catch(() => {
        if (!active) return;
        clearToken();
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem('saas_real_admin');
        setUser(null);
        setRealAdminUser(null);
        setToken(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const roleCode: RoleCode = AuthorizationService.getUserRole(user);

  const hasPermission = (permission: PermissionCode): boolean => {
    return AuthorizationService.hasPermission(user, permission);
  };

  const can = (resource: any, action: any): boolean => {
    return AuthorizationService.can(user, resource, action);
  };

  /**
   * Stores a session returned by the API. The role always comes from the
   * server payload — the UI never decides who the user is.
   */
  const adoptSession = (newToken: string, userObj: User) => {
    setUser(userObj);
    setRealAdminUser(null);
    setToken(newToken);
    setToken_(newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userObj));
    localStorage.removeItem('saas_real_admin');
  };

  /**
   * Real authentication: the password typed by the user is sent to the API,
   * which compares it with bcrypt. A wrong password yields 401 and false here.
   */
  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const data = await api.post<{ success: boolean; token: string; user: User }>(
        '/api/auth/login',
        { email, password }
      );
      if (!data?.token || !data?.user) return null;
      adoptSession(data.token, data.user);
      return data.user;
    } catch {
      // ApiError (401 included) simply means the login failed.
      return null;
    }
  };

  const impersonateCompany = async (companyId: string, companyName: string): Promise<boolean> => {
    const adminSource = realAdminUser || user;
    if (!adminSource || !AuthorizationService.hasPermission(adminSource, 'companies.impersonate')) {
      alert('Acesso negado: Apenas ADMIN_MASTER pode assumir login de empresas.');
      return false;
    }

    const { impersonatedUser, auditLogPayload } = AuthorizationService.impersonateCompany(
      adminSource,
      companyId,
      companyName
    );

    // UI-level view switch only. The JWT still identifies the real admin, and
    // the backend authorizes every request from that token.
    setRealAdminUser(adminSource);
    setUser(impersonatedUser);
    localStorage.setItem('saas_real_admin', JSON.stringify(adminSource));
    localStorage.setItem(USER_KEY, JSON.stringify(impersonatedUser));

    // Audit trail. Sent with the bearer token; a failure must not block the UI.
    try {
      await api.post('/api/admin/audit-logs', auditLogPayload);
    } catch {
      /* the audit endpoint being unavailable does not undo the view switch */
    }
    return true;
  };

  const stopImpersonating = () => {
    if (realAdminUser) {
      setUser(realAdminUser);
      setRealAdminUser(null);
      localStorage.setItem(USER_KEY, JSON.stringify(realAdminUser));
      localStorage.removeItem('saas_real_admin');
    }
  };

  const logout = () => {
    setUser(null);
    setRealAdminUser(null);
    setToken(null);
    clearToken();
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('saas_real_admin');
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        realAdminUser,
        token,
        isAuthenticated: Boolean(user),
        isAdminMaster: Boolean(user) && (user?.role === 'admin_master' || user?.role === 'admin'),
        isEmpresario: Boolean(user) && (user?.role === 'advertiser' || user?.role === 'admin_master' || user?.role === 'admin'),
        isImpersonating: Boolean(realAdminUser),
        roleCode,
        hasPermission,
        can,
        login,
        adoptSession,
        logout,
        impersonateCompany,
        stopImpersonating,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Guia Comercial Multi-Tenant SaaS Root Component
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { MercadoPagoProvider } from './context/MercadoPagoContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CompanyProvider>
          <MercadoPagoProvider>
            <AppRoutes />
          </MercadoPagoProvider>
        </CompanyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

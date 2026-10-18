/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PermissionGate Component - Conditional UI Rendering based on RBAC & ACL
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthorizationService } from '../../services/authorizationService';
import { PermissionCode, FeatureFlag } from '../../types/authPermissions';
import { Company } from '../../types';

interface PermissionGateProps {
  permission?: PermissionCode;
  feature?: FeatureFlag;
  company?: Company | null;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  feature,
  company,
  fallback = null,
  children
}) => {
  const { user } = useAuth();

  if (permission && !AuthorizationService.hasPermission(user, permission)) {
    return <>{fallback}</>;
  }

  if (feature && !AuthorizationService.isFeatureEnabled(feature, company)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

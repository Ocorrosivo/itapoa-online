/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PermissionButton Component - Protected Action Button
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthorizationService } from '../../services/authorizationService';
import { PermissionCode } from '../../types/authPermissions';

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: PermissionCode;
  hideIfUnauthorized?: boolean;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  hideIfUnauthorized = true,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const { user } = useAuth();
  const hasAccess = AuthorizationService.hasPermission(user, permission);

  if (!hasAccess) {
    if (hideIfUnauthorized) return null;
    return (
      <button
        {...props}
        disabled={true}
        className={`${className} opacity-50 cursor-not-allowed text-slate-500`}
        title="Você não possui permissão para esta ação"
      >
        {children}
      </button>
    );
  }

  return (
    <button {...props} disabled={disabled} className={className}>
      {children}
    </button>
  );
};

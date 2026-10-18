/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Authorization Service - Centralized RBAC + ACL & Impersonation Engine
 */

import { User, Company, PlanLevel } from '../types';
import { RoleCode, PermissionCode, FeatureFlag, MenuItem } from '../types/authPermissions';
import { PermissionService } from './permissionService';

// Standard mapping of permissions per role for immediate client-side validation
const ROLE_PERMISSIONS_MAP: Record<RoleCode, PermissionCode[]> = {
  ADMIN_MASTER: [
    'companies.view', 'companies.create', 'companies.edit', 'companies.delete', 'companies.impersonate',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'services.view', 'services.create', 'services.edit', 'services.delete',
    'plans.manage', 'payments.manage',
    'crm.view', 'crm.edit', 'crm.delete',
    'analytics.view', 'analytics.export',
    'seo.manage', 'blog.manage', 'events.manage', 'tourism.manage', 'banners.manage',
    'media.manage', 'reviews.moderate', 'notifications.send', 'support.manage',
    'settings.manage', 'users.manage'
  ],
  ADMIN_FINANCEIRO: [
    'plans.manage', 'payments.manage', 'analytics.view', 'analytics.export', 'companies.view'
  ],
  ADMIN_SUPORTE: [
    'companies.view', 'support.manage', 'crm.view', 'users.manage'
  ],
  ADMIN_MARKETING: [
    'blog.manage', 'seo.manage', 'events.manage', 'tourism.manage', 'banners.manage', 'notifications.send'
  ],
  ADMIN_MODERADOR: [
    'reviews.moderate', 'companies.view', 'blog.manage'
  ],
  EMPRESARIO_OWNER: [
    'companies.view', 'companies.edit',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'services.view', 'services.create', 'services.edit', 'services.delete',
    'crm.view', 'crm.edit', 'crm.delete', 'analytics.view', 'media.manage'
  ],
  EMPRESARIO_GERENTE: [
    'companies.view', 'companies.edit',
    'products.view', 'products.create', 'products.edit',
    'services.view', 'services.create', 'services.edit',
    'crm.view', 'crm.edit', 'analytics.view', 'media.manage'
  ],
  FUNCIONARIO: [
    'products.view', 'services.view', 'crm.view', 'media.manage'
  ],
  EDITOR: [
    'products.view', 'products.create', 'products.edit',
    'services.view', 'services.create', 'services.edit',
    'blog.manage', 'media.manage'
  ],
  ATENDENTE: [
    'crm.view', 'crm.edit', 'services.view'
  ],
  VISITANTE: [
    'companies.view', 'products.view', 'services.view'
  ]
};

export class AuthorizationService {
  /**
   * Determine the mapped RoleCode from user profile
   */
  static getUserRole(user: User | null | undefined): RoleCode {
    if (!user) return 'VISITANTE';
    if (user.role === 'admin_master' || user.role === 'admin') return 'ADMIN_MASTER';
    if (user.role === 'advertiser') return 'EMPRESARIO_OWNER';
    return (user.role as RoleCode) || 'VISITANTE';
  }

  /**
   * Check if a user has a specific granular permission
   */
  static hasPermission(
    user: User | null | undefined,
    permission: PermissionCode
  ): boolean {
    if (!user) return false;
    const role = this.getUserRole(user);
    if (role === 'ADMIN_MASTER') return true;

    const allowedPermissions = ROLE_PERMISSIONS_MAP[role] || [];
    return allowedPermissions.includes(permission);
  }

  /**
   * Check if user has a specific role
   */
  static hasRole(user: User | null | undefined, targetRole: RoleCode): boolean {
    if (!user) return targetRole === 'VISITANTE';
    const currentRole = this.getUserRole(user);
    if (currentRole === 'ADMIN_MASTER') return true;
    return currentRole === targetRole;
  }

  /**
   * Validate granular CRUD permission
   */
  static can(
    user: User | null | undefined,
    resource: 'companies' | 'products' | 'services' | 'crm' | 'blog' | 'events' | 'tourism' | 'payments',
    action: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export'
  ): boolean {
    const permCode = `${resource}.${action}` as PermissionCode;
    return this.hasPermission(user, permCode);
  }

  /**
   * Feature Flag Evaluator
   */
  static isFeatureEnabled(feature: FeatureFlag, company?: Company | null): boolean {
    if (!company) return true;
    const caps = PermissionService.getCapabilities(company.planLevel);
    
    switch (feature) {
      case 'feature_crm':
        return caps.canAccessCRM;
      case 'feature_ai':
        return company.planLevel === 'diamond' || company.planLevel === 'diamond_extremo';
      case 'feature_events':
        return company.planLevel !== 'bronze';
      case 'feature_tourism':
        return true;
      default:
        return true;
    }
  }

  /**
   * Dynamic Menu Builder based on granular user permissions
   */
  static getDynamicMenuItems(user: User | null | undefined): MenuItem[] {
    const role = this.getUserRole(user);

    if (role === 'ADMIN_MASTER') {
      return [
        { id: 'dashboard', label: 'Painel Master', path: '/admin', requiredPermission: 'companies.view' },
        { id: 'companies', label: 'Empresas', path: '/admin/companies', requiredPermission: 'companies.edit' },
        { id: 'plans', label: 'Planos & Preços', path: '/admin/plans', requiredPermission: 'plans.manage' },
        { id: 'payments', label: 'Financeiro & PIX', path: '/admin/payments', requiredPermission: 'payments.manage' },
        { id: 'support', label: 'Suporte & CRM', path: '/admin/support', requiredPermission: 'support.manage' },
        { id: 'blog', label: 'Notícias & Blog', path: '/admin/blog', requiredPermission: 'blog.manage' },
        { id: 'audit', label: 'Auditoria de Logs', path: '/admin/audit', requiredPermission: 'settings.manage' }
      ];
    }

    if (role === 'EMPRESARIO_OWNER' || role === 'EMPRESARIO_GERENTE') {
      return [
        { id: 'profile', label: 'Meu Mini-Site', path: '/painel/profile', requiredPermission: 'companies.edit' },
        { id: 'products', label: 'Meus Produtos', path: '/painel/products', requiredPermission: 'products.view' },
        { id: 'crm', label: 'CRM de Clientes', path: '/painel/crm', requiredPermission: 'crm.view', requiredFeature: 'feature_crm' },
        { id: 'coupons', label: 'Cupons de Desconto', path: '/painel/coupons', requiredPermission: 'products.edit' },
        { id: 'metrics', label: 'Métricas & Vendas', path: '/painel/metrics', requiredPermission: 'analytics.view' }
      ];
    }

    return [
      { id: 'home', label: 'Início', path: '/' },
      { id: 'directory', label: 'Empresas', path: '/directory' },
      { id: 'tourism', label: 'Turismo', path: '/tourism' },
      { id: 'events', label: 'Eventos', path: '/events' },
      { id: 'blog', label: 'Blog', path: '/blog' }
    ];
  }

  /**
   * Impersonation Engine ("Login como Empresa") for ADMIN_MASTER
   */
  static impersonateCompany(adminUser: User, companyId: string, companyName: string): {
    impersonatedUser: User;
    auditLogPayload: object;
  } {
    if (!this.hasPermission(adminUser, 'companies.impersonate')) {
      throw new Error('Acesso negado: Apenas ADMIN_MASTER pode assumir login de empresas.');
    }

    const impersonatedUser: User = {
      id: `impersonated_${companyId}`,
      name: `Sessão Assumida: ${companyName}`,
      email: adminUser.email,
      role: 'advertiser',
      createdAt: new Date().toISOString()
    };

    const auditLogPayload = {
      user_id: adminUser.id,
      user_email: adminUser.email,
      tabela: 'companies',
      acao: 'LOGIN_COMO_EMPRESA',
      detalhes: {
        impersonated_company_id: companyId,
        company_name: companyName,
        timestamp: new Date().toISOString()
      }
    };

    return { impersonatedUser, auditLogPayload };
  }
}

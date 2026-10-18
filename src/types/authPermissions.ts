/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RBAC & ACL Permission Constants & Role Definitions
 */

export type RoleCode = 
  | 'ADMIN_MASTER'
  | 'ADMIN_FINANCEIRO'
  | 'ADMIN_SUPORTE'
  | 'ADMIN_MARKETING'
  | 'ADMIN_MODERADOR'
  | 'EMPRESARIO_OWNER'
  | 'EMPRESARIO_GERENTE'
  | 'FUNCIONARIO'
  | 'EDITOR'
  | 'ATENDENTE'
  | 'VISITANTE';

export type PermissionCode =
  | 'companies.view'
  | 'companies.create'
  | 'companies.edit'
  | 'companies.delete'
  | 'companies.impersonate'
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'services.view'
  | 'services.create'
  | 'services.edit'
  | 'services.delete'
  | 'plans.manage'
  | 'payments.manage'
  | 'crm.view'
  | 'crm.edit'
  | 'crm.delete'
  | 'analytics.view'
  | 'analytics.export'
  | 'seo.manage'
  | 'blog.manage'
  | 'events.manage'
  | 'tourism.manage'
  | 'banners.manage'
  | 'media.manage'
  | 'reviews.moderate'
  | 'notifications.send'
  | 'support.manage'
  | 'settings.manage'
  | 'users.manage';

export type FeatureFlag =
  | 'feature_blog'
  | 'feature_crm'
  | 'feature_marketplace'
  | 'feature_events'
  | 'feature_ai'
  | 'feature_api'
  | 'feature_chat'
  | 'feature_reviews'
  | 'feature_tourism';

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  requiredPermission?: PermissionCode;
  requiredFeature?: FeatureFlag;
  badge?: string;
}

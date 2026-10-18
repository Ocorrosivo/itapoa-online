/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Custom Hook for Plan Capability Checking
 */

import { Company, PlanLevel } from '../types';
import { PermissionService, PlanCapabilities } from '../services/permissionService';

export function usePermissions(company: Company | null | undefined) {
  const planLevel: PlanLevel = company?.planLevel || 'bronze';
  const capabilities: PlanCapabilities = PermissionService.getCapabilities(planLevel);

  return {
    capabilities,
    can: (feature: keyof PlanCapabilities) => PermissionService.can(company, feature),
    canAddMore: (resource: 'images' | 'videos' | 'products' | 'jobs' | 'campaigns', currentCount: number) =>
      PermissionService.canAddMore(company, resource, currentCount)
  };
}

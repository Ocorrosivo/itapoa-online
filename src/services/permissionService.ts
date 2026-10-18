/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Permission Service - Centralized Plan & Capabilities Engine
 */

import { PlanLevel, Company } from '../types';

export interface PlanCapabilities {
  maxImages: number;
  maxVideos: number;
  maxProducts: number;
  maxJobs: number;
  maxCampaigns: number;
  canAccessCRM: boolean;
  canCreateCoupons: boolean;
  canPublishPromotions: boolean;
  hasDiamondBadge: boolean;
  hasPremiumBadge: boolean;
  hasSeoTools: boolean;
  hasAnalytics: boolean;
  priorityLevel: number;
}

const PLAN_CAPABILITIES_MAP: Record<PlanLevel, PlanCapabilities> = {
  bronze: {
    maxImages: 3,
    maxVideos: 0,
    maxProducts: 5,
    maxJobs: 1,
    maxCampaigns: 1,
    canAccessCRM: false,
    canCreateCoupons: false,
    canPublishPromotions: false,
    hasDiamondBadge: false,
    hasPremiumBadge: false,
    hasSeoTools: false,
    hasAnalytics: false,
    priorityLevel: 1
  },
  prata: {
    maxImages: 10,
    maxVideos: 1,
    maxProducts: 15,
    maxJobs: 3,
    maxCampaigns: 2,
    canAccessCRM: false,
    canCreateCoupons: true,
    canPublishPromotions: true,
    hasDiamondBadge: false,
    hasPremiumBadge: true,
    hasSeoTools: false,
    hasAnalytics: true,
    priorityLevel: 2
  },
  ouro: {
    maxImages: 25,
    maxVideos: 3,
    maxProducts: 50,
    maxJobs: 10,
    maxCampaigns: 5,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    hasDiamondBadge: false,
    hasPremiumBadge: true,
    hasSeoTools: true,
    hasAnalytics: true,
    priorityLevel: 3
  },
  gold_vip: {
    maxImages: 25,
    maxVideos: 3,
    maxProducts: 50,
    maxJobs: 10,
    maxCampaigns: 5,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    hasDiamondBadge: false,
    hasPremiumBadge: true,
    hasSeoTools: true,
    hasAnalytics: true,
    priorityLevel: 3
  },
  diamond: {
    maxImages: 999,
    maxVideos: 10,
    maxProducts: 999,
    maxJobs: 999,
    maxCampaigns: 999,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    hasDiamondBadge: true,
    hasPremiumBadge: true,
    hasSeoTools: true,
    hasAnalytics: true,
    priorityLevel: 4
  },
  diamond_extremo: {
    maxImages: 999,
    maxVideos: 10,
    maxProducts: 999,
    maxJobs: 999,
    maxCampaigns: 999,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    hasDiamondBadge: true,
    hasPremiumBadge: true,
    hasSeoTools: true,
    hasAnalytics: true,
    priorityLevel: 4
  }
};

export class PermissionService {
  static getCapabilities(planLevel: PlanLevel): PlanCapabilities {
    return PLAN_CAPABILITIES_MAP[planLevel] || PLAN_CAPABILITIES_MAP.bronze;
  }

  static can(company: Company | null | undefined, feature: keyof PlanCapabilities): boolean {
    if (!company) return false;
    const caps = this.getCapabilities(company.planLevel);
    const value = caps[feature];
    return typeof value === 'boolean' ? value : Boolean(value);
  }

  static canAddMore(
    company: Company | null | undefined,
    resource: 'images' | 'videos' | 'products' | 'jobs' | 'campaigns',
    currentCount: number
  ): boolean {
    if (!company) return false;
    const caps = this.getCapabilities(company.planLevel);
    
    switch (resource) {
      case 'images':
        return currentCount < caps.maxImages;
      case 'videos':
        return currentCount < caps.maxVideos;
      case 'products':
        return currentCount < caps.maxProducts;
      case 'jobs':
        return currentCount < caps.maxJobs;
      case 'campaigns':
        return currentCount < caps.maxCampaigns;
      default:
        return false;
    }
  }
}

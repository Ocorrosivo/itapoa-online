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
  maxActivePromotions: number;
  hasDiamondBadge: boolean;
  hasPremiumBadge: boolean;
  hasHomeHighlight: boolean;
  hasSeoTools: boolean;
  hasAnalytics: boolean;
  priorityLevel: number;
}

const PLAN_CAPABILITIES_MAP: Record<PlanLevel, PlanCapabilities> = {
  bronze: {
    maxImages: 3,
    maxVideos: 0,
    maxProducts: 0,
    maxJobs: 0,
    maxCampaigns: 0,
    canAccessCRM: true,
    canCreateCoupons: false,
    canPublishPromotions: false,
    maxActivePromotions: 0,
    hasDiamondBadge: false,
    hasPremiumBadge: false,
    hasHomeHighlight: false,
    hasSeoTools: false,
    hasAnalytics: true,
    priorityLevel: 1
  },
  prata: {
    maxImages: 15,
    maxVideos: 1,
    maxProducts: 5,
    maxJobs: 3,
    maxCampaigns: 2,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    maxActivePromotions: 1,
    hasDiamondBadge: false,
    hasPremiumBadge: true,
    hasHomeHighlight: true,
    hasSeoTools: false,
    hasAnalytics: true,
    priorityLevel: 2
  },
  ouro: {
    maxImages: 15,
    maxVideos: 3,
    maxProducts: 5,
    maxJobs: 5,
    maxCampaigns: 3,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    maxActivePromotions: 1,
    hasDiamondBadge: false,
    hasPremiumBadge: true,
    hasHomeHighlight: true,
    hasSeoTools: true,
    hasAnalytics: true,
    priorityLevel: 2
  },
  gold_vip: {
    maxImages: 15,
    maxVideos: 3,
    maxProducts: 5,
    maxJobs: 5,
    maxCampaigns: 3,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    maxActivePromotions: 1,
    hasDiamondBadge: false,
    hasPremiumBadge: true,
    hasHomeHighlight: true,
    hasSeoTools: true,
    hasAnalytics: true,
    priorityLevel: 2
  },
  diamond: {
    maxImages: 30,
    maxVideos: 10,
    maxProducts: 30,
    maxJobs: 10,
    maxCampaigns: 5,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    maxActivePromotions: 3,
    hasDiamondBadge: true,
    hasPremiumBadge: true,
    hasHomeHighlight: true,
    hasSeoTools: true,
    hasAnalytics: true,
    priorityLevel: 3
  },
  diamond_extremo: {
    maxImages: 30,
    maxVideos: 10,
    maxProducts: 30,
    maxJobs: 10,
    maxCampaigns: 5,
    canAccessCRM: true,
    canCreateCoupons: true,
    canPublishPromotions: true,
    maxActivePromotions: 3,
    hasDiamondBadge: true,
    hasPremiumBadge: true,
    hasHomeHighlight: true,
    hasSeoTools: true,
    hasAnalytics: true,
    priorityLevel: 3
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Trial & Read-Only Mode Service - Clean Architecture
 */

export interface TrialStatusInfo {
  isTrial: boolean;
  isExpired: boolean;
  readOnlyMode: boolean;
  daysRemaining: number;
  trialEndsAt: string;
}

export class TrialService {
  /**
   * Calculate trial status and Read-Only Mode for a company
   */
  static calculateTrialStatus(
    createdAtStr: string,
    subscriptionStatus: string = 'trial',
    trialDays: number = 7
  ): TrialStatusInfo {
    const createdAt = new Date(createdAtStr || Date.now());
    const trialEndsAt = new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const diffMs = trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const isTrial = subscriptionStatus === 'trial' || subscriptionStatus === 'pending';
    const isExpired = isTrial && daysRemaining <= 0;
    
    // Read-Only Mode is active when trial has expired and plan is not active
    const readOnlyMode = isExpired && (subscriptionStatus as string) !== 'active';

    return {
      isTrial,
      isExpired,
      readOnlyMode,
      daysRemaining,
      trialEndsAt: trialEndsAt.toISOString()
    };
  }
}

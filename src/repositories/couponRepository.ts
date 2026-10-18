/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Coupon Repository - Coupons & Redemptions Engine
 */


import { Coupon } from '../types';

export class CouponRepository {
  static async getActiveCoupons(companyId?: string): Promise<Coupon[]> {


    try {
      const url = companyId ? `/api/coupons?companyId=${companyId}` : '/api/coupons';
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API fallback error for coupons');
    }

    return [];
  }

  static async saveCoupon(coupon: Partial<Coupon>): Promise<Coupon> {


    try {
      const res = await fetch('/api/coupons', {
        method: coupon.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupon)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('API fallback coupon save error:', err);
    }

    return coupon as Coupon;
  }

}

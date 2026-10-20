/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pending purchase (intent) — preserves plan selection across cadastro/login.
 * Only stores planId + optional companyId; no secrets, no prices. Whitelist + expiry.
 */

const KEY = 'itapoa_pending_purchase';
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

const PLAN_IDS = new Set(['plan_bronze', 'plan_gold_vip', 'plan_diamond_extremo', 'bronze', 'gold_vip', 'diamond_extremo']);

const normalizePlanId = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  const full = s.startsWith('plan_') ? s : `plan_${s}`;
  return PLAN_IDS.has(full) || PLAN_IDS.has(s) ? (full.startsWith('plan_') ? full : `plan_${s}`) : null;
};

export interface PendingPurchase {
  planId: string;
  companyId?: string;
  createdAt: number;
}

export const savePendingPurchase = (planId: string, companyId?: string): void => {
  const normalized = normalizePlanId(planId);
  if (!normalized) return;
  const payload: PendingPurchase = { planId: normalized, createdAt: Date.now() };
  if (companyId && typeof companyId === 'string' && companyId.trim()) {
    payload.companyId = companyId.trim().slice(0, 128);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {}
};

export const readPendingPurchase = (): PendingPurchase | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPurchase;
    if (!parsed || typeof parsed.planId !== 'string') return null;
    const normalized = normalizePlanId(parsed.planId);
    if (!normalized) return null;
    if (typeof parsed.createdAt !== 'number' || Date.now() - parsed.createdAt > TTL_MS) {
      clearPendingPurchase();
      return null;
    }
    return { planId: normalized, companyId: parsed.companyId, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
};

export const clearPendingPurchase = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {}
};

export const consumePendingPurchase = (): PendingPurchase | null => {
  const p = readPendingPurchase();
  if (p) clearPendingPurchase();
  return p;
};

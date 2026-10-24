/** Purchase intent is never a price, privilege, redirect URL or company identifier. */
export function registrationPlan(value: unknown): string | null {
  return typeof value === 'string' && ['plan_bronze', 'plan_gold_vip', 'plan_diamond_extremo'].includes(value) ? value : null;
}

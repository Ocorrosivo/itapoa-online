/** Search semantics shared by the browser and the API. */
export const normalizeSearch = (value: unknown): string =>
  typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    : '';

export const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const arrayFromPayload = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value;
  const data = (value as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data : [];
};

export const featureArray = (value: unknown): string[] => {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
};

export const matchesCompanySearch = (company: Record<string, any>, query: unknown): boolean => {
  const term = normalizeSearch(query);
  if (!term) return true;
  return [company.name, company.description, company.detailedDescription, company.address,
    ...featureArray(company.features)].some(value => normalizeSearch(value).includes(term));
};

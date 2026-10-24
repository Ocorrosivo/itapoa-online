import { ServiceError } from './crudService.js';

/** Only caller-supplied fields are returned; empty strings explicitly clear links. */
export function companyContactLinks(data: Record<string, unknown>) {
  const result: Record<string, string | null> = {};
  for (const field of ['instagram', 'facebook', 'tiktok', 'website']) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
    const raw = data[field];
    if (raw === null) { result[field] = null; continue; }
    if (typeof raw !== 'string') throw new ServiceError(400, `Formato inválido para ${field}.`);
    const value = raw.trim();
    if (!value) { result[field] = ''; continue; }
    if (value.length > (field === 'website' ? 500 : 255) || /[\u0000-\u0020\u007f]/.test(value)) {
      throw new ServiceError(400, `Link inválido para ${field}.`);
    }
    if (field !== 'website' && /^@?[a-zA-Z0-9_.-]+$/.test(value)) {
      result[field] = value;
      continue;
    }
    let url: URL;
    try { url = new URL(value); } catch { throw new ServiceError(400, `Informe uma URL http ou https para ${field}.`); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
      throw new ServiceError(400, `Link inválido para ${field}.`);
    }
    result[field] = value;
  }
  return result;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single HTTP entry point for the frontend.
 *
 * Every call to the API goes through `apiFetch`, which attaches
 * `Authorization: Bearer <token>` whenever a session token is stored. The token
 * lives in one place only (TOKEN_KEY), so login, session restore and logout can
 * never disagree about where it is kept.
 */

export const TOKEN_KEY = 'saas_token';
export const USER_KEY = 'saas_user';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable (private mode); the session stays in memory only */
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
};

/** Raised for any non-2xx response so callers can branch on the real status. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const isFormData = (body: unknown): boolean =>
  typeof FormData !== 'undefined' && body instanceof FormData;

/**
 * fetch wrapper that injects the bearer token and JSON content type.
 * The response is returned untouched so existing `res.ok` checks keep working.
 */
export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(init.headers ?? {});

  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // multipart bodies must keep the boundary the browser generates.
  if (init.body !== undefined && !isFormData(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(path, { ...init, headers });
};

/** Parses a JSON response, turning any non-2xx into an ApiError. */
const parse = async <T>(res: Response): Promise<T> => {
  const text = await res.text();
  const payload = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in (payload as any)
        ? String((payload as any).error)
        : null) ?? `Falha na requisição (HTTP ${res.status}).`;
    throw new ApiError(res.status, message);
  }

  return payload as T;
};

const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const api = {
  get: <T>(path: string) => apiFetch(path).then(res => parse<T>(res)),

  post: <T>(path: string, body?: unknown) =>
    apiFetch(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body)
    }).then(res => parse<T>(res)),

  put: <T>(path: string, body?: unknown) =>
    apiFetch(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body)
    }).then(res => parse<T>(res)),

  del: <T>(path: string) => apiFetch(path, { method: 'DELETE' }).then(res => parse<T>(res)),

  /** Multipart upload. The browser sets the boundary; we only add the token. */
  upload: <T>(path: string, form: FormData) =>
    apiFetch(path, { method: 'POST', body: form }).then(res => parse<T>(res))
};

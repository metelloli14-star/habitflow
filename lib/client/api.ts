// Tiny fetch wrapper used by the data hooks. All requests are same-origin and send the session cookie.

import type { ApiErrorBody } from '@/lib/shared/types';

export class ApiClientError extends Error {
  status: number;
  code?: string;
  body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === 'string' ? body.error : 'Не удалось выполнить запрос');
    this.status = status;
    this.code = typeof body.code === 'string' ? body.code : undefined;
    this.body = body;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, { error: 'Нет соединения. Проверьте интернет и попробуйте ещё раз' });
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) throw new ApiClientError(res.status, (data ?? {}) as ApiErrorBody & Record<string, unknown>);
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
};

/** SWR fetcher */
export const fetcher = <T>(url: string) => api.get<T>(url);

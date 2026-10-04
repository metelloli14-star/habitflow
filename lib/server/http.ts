import { NextResponse } from 'next/server';
import { isValidDateStr, todayStr } from '@/lib/shared/dates';

/** Throw this from anywhere in a route/service to return a clean JSON error. */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, 'Некорректные данные запроса');
  }
}

/**
 * The person's local calendar day, sent by the client as ?date=YYYY-MM-DD
 * (the server's timezone may differ from theirs). Falls back to the server's date.
 */
export function requestDate(req: Request): string {
  const date = new URL(req.url).searchParams.get('date');
  return isValidDateStr(date) ? date : todayStr();
}

/** Wraps a route handler: turns ApiError into JSON responses and hides unexpected errors. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      console.error('[api] Unexpected error:', err);
      return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
  };
}

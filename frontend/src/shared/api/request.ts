import { ApiError } from './api-error';

const API_BASE = '/api';

const FALLBACK_ERROR_KEY = 'error.generic';
const FALLBACK_ERROR_MESSAGE = 'Request failed';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: object;
}

interface ErrorBody {
  errorKey?: string;
  errorMessage?: string;
  message?: string;
}

/**
 * Low-level API request with Bearer token and standardized error (errorKey + errorMessage).
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, ...rest } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(rest.headers as HeadersInit),
  };
  const token = localStorage.getItem('accessToken');
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const raw = await res.json().catch(() => ({}));
    const errBody = raw as ErrorBody;
    const errorKey = errBody.errorKey ?? FALLBACK_ERROR_KEY;
    const errorMessage =
      errBody.errorMessage ?? errBody.message ?? res.statusText ?? FALLBACK_ERROR_MESSAGE;
    throw new ApiError(errorMessage, errorKey, errorMessage);
  }
  return res.json() as Promise<T>;
}
